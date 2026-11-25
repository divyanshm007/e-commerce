using EcommerceApp.Application.Common;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.API.Controllers.v1;

public class QuizController : BaseController
{
    private readonly AppDbContext _db;
    public QuizController(AppDbContext db) { _db = db; }

    // ===== PUBLIC =====

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(ApiResponse<object>.Ok(
            await _db.Quizzes
                .Where(q => q.IsActive)
                .OrderBy(q => q.SortOrder)
                .Select(q => new { q.Id, q.Title, q.Slug, q.Description, q.HeroGradient })
                .ToListAsync()
        ));

    [HttpGet("slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.ResultTypes.OrderBy(rt => rt.SortOrder))
            .Include(q => q.Questions.OrderBy(qq => qq.SortOrder))
                .ThenInclude(qq => qq.Options.OrderBy(o => o.SortOrder))
            .FirstOrDefaultAsync(q => q.Slug == slug && q.IsActive);

        if (quiz == null) return NotFound();
        return Ok(ApiResponse<object>.Ok(MapQuizFull(quiz)));
    }

    // ===== ADMIN =====

    [HttpGet("admin")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAllAdmin() =>
        Ok(ApiResponse<object>.Ok(
            await _db.Quizzes
                .OrderBy(q => q.SortOrder)
                .Select(q => new
                {
                    q.Id, q.Title, q.Slug, q.Description, q.HeroGradient, q.IsActive, q.SortOrder,
                    questionCount    = q.Questions.Count,
                    resultTypeCount  = q.ResultTypes.Count
                })
                .ToListAsync()
        ));

    [HttpGet("{id:guid}/full")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetFull(Guid id)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.ResultTypes.OrderBy(rt => rt.SortOrder))
            .Include(q => q.Questions.OrderBy(qq => qq.SortOrder))
                .ThenInclude(qq => qq.Options.OrderBy(o => o.SortOrder))
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quiz == null) return NotFound();
        return Ok(ApiResponse<object>.Ok(MapQuizFull(quiz)));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] Quiz quiz)
    {
        if (await _db.Quizzes.AnyAsync(q => q.Slug == quiz.Slug))
            return BadRequest(ApiResponse<object>.Fail("Slug already exists"));
        await _db.Quizzes.AddAsync(quiz);
        await _db.SaveChangesAsync();
        return Ok(quiz);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Quiz updated)
    {
        var quiz = await _db.Quizzes.FindAsync(id);
        if (quiz == null) return NotFound();
        if (await _db.Quizzes.AnyAsync(q => q.Slug == updated.Slug && q.Id != id))
            return BadRequest(ApiResponse<object>.Fail("Slug already exists"));

        quiz.Title        = updated.Title;
        quiz.Slug         = updated.Slug;
        quiz.Description  = updated.Description;
        quiz.HeroGradient = updated.HeroGradient;
        quiz.SortOrder    = updated.SortOrder;
        quiz.IsActive     = updated.IsActive;
        await _db.SaveChangesAsync();
        return Ok(quiz);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var quiz = await _db.Quizzes.FindAsync(id);
        if (quiz == null) return NotFound();
        _db.Quizzes.Remove(quiz);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ===== RESULT TYPES =====

    [HttpPost("{quizId:guid}/result-types")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> AddResultType(Guid quizId, [FromBody] QuizResultType rt)
    {
        if (!await _db.Quizzes.AnyAsync(q => q.Id == quizId)) return NotFound();
        rt.QuizId = quizId;
        await _db.QuizResultTypes.AddAsync(rt);
        await _db.SaveChangesAsync();
        return Ok(rt);
    }

    [HttpPut("result-types/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateResultType(Guid id, [FromBody] QuizResultType updated)
    {
        var rt = await _db.QuizResultTypes.FindAsync(id);
        if (rt == null) return NotFound();
        rt.Key           = updated.Key;
        rt.Title         = updated.Title;
        rt.Emoji         = updated.Emoji;
        rt.Description   = updated.Description;
        rt.Traits        = updated.Traits;
        rt.Recommendations = updated.Recommendations;
        rt.SearchTerms   = updated.SearchTerms;
        rt.ColorGradient = updated.ColorGradient;
        rt.SortOrder     = updated.SortOrder;
        await _db.SaveChangesAsync();
        return Ok(rt);
    }

    [HttpDelete("result-types/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteResultType(Guid id)
    {
        var rt = await _db.QuizResultTypes.FindAsync(id);
        if (rt == null) return NotFound();
        _db.QuizResultTypes.Remove(rt);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ===== QUESTIONS =====

    [HttpPost("{quizId:guid}/questions")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> AddQuestion(Guid quizId, [FromBody] QuestionWithOptionsDto dto)
    {
        if (!await _db.Quizzes.AnyAsync(q => q.Id == quizId)) return NotFound();

        var question = new QuizQuestion
        {
            QuizId    = quizId,
            Text      = dto.Text,
            SortOrder = dto.SortOrder,
            Options   = dto.Options.Select((o, i) => new QuizOption
            {
                Text          = o.Text,
                ResultTypeKey = o.ResultTypeKey,
                SortOrder     = o.SortOrder > 0 ? o.SortOrder : i + 1
            }).ToList()
        };

        await _db.QuizQuestions.AddAsync(question);
        await _db.SaveChangesAsync();

        await _db.Entry(question).Collection(q => q.Options).LoadAsync();
        return Ok(new
        {
            question.Id, question.Text, question.SortOrder,
            options = question.Options.OrderBy(o => o.SortOrder).Select(o => new
            {
                o.Id, o.Text, o.ResultTypeKey, o.SortOrder
            })
        });
    }

    [HttpPut("questions/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateQuestion(Guid id, [FromBody] QuestionWithOptionsDto dto)
    {
        var question = await _db.QuizQuestions
            .Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == id);
        if (question == null) return NotFound();

        question.Text      = dto.Text;
        question.SortOrder = dto.SortOrder;

        // Replace all options
        _db.QuizOptions.RemoveRange(question.Options);
        question.Options = dto.Options.Select((o, i) => new QuizOption
        {
            QuestionId    = id,
            Text          = o.Text,
            ResultTypeKey = o.ResultTypeKey,
            SortOrder     = o.SortOrder > 0 ? o.SortOrder : i + 1
        }).ToList();

        await _db.SaveChangesAsync();
        return Ok(new
        {
            question.Id, question.Text, question.SortOrder,
            options = question.Options.OrderBy(o => o.SortOrder).Select(o => new
            {
                o.Id, o.Text, o.ResultTypeKey, o.SortOrder
            })
        });
    }

    [HttpDelete("questions/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteQuestion(Guid id)
    {
        var question = await _db.QuizQuestions.FindAsync(id);
        if (question == null) return NotFound();
        _db.QuizQuestions.Remove(question);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ===== Helper =====

    private static object MapQuizFull(Quiz quiz) => new
    {
        quiz.Id, quiz.Title, quiz.Slug, quiz.Description, quiz.HeroGradient, quiz.IsActive, quiz.SortOrder,
        resultTypes = quiz.ResultTypes.Select(rt => new
        {
            rt.Id, rt.Key, rt.Title, rt.Emoji, rt.Description,
            rt.Traits, rt.Recommendations, rt.SearchTerms, rt.ColorGradient, rt.SortOrder
        }),
        questions = quiz.Questions.Select(q => new
        {
            q.Id, q.Text, q.SortOrder,
            options = q.Options.Select(o => new { o.Id, o.Text, o.ResultTypeKey, o.SortOrder })
        })
    };
}

public record QuestionWithOptionsDto(
    string Text,
    int SortOrder,
    List<OptionDto> Options
);

public record OptionDto(
    Guid? Id,
    string Text,
    string ResultTypeKey,
    int SortOrder
);
