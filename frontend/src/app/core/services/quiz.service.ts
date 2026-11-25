import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class QuizService {
  constructor(private api: ApiService) {}

  // Public
  getActiveQuizzes(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('quiz');
  }

  getQuizBySlug(slug: string): Observable<ApiResponse<any>> {
    return this.api.get<any>(`quiz/slug/${slug}`);
  }

  // Admin — quizzes
  getAllQuizzes(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('quiz/admin');
  }

  getQuizFull(id: string): Observable<ApiResponse<any>> {
    return this.api.get<any>(`quiz/${id}/full`);
  }

  createQuiz(dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>('quiz', dto);
  }

  updateQuiz(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`quiz/${id}`, dto);
  }

  deleteQuiz(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`quiz/${id}`);
  }

  // Admin — result types
  addResultType(quizId: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>(`quiz/${quizId}/result-types`, dto);
  }

  updateResultType(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`quiz/result-types/${id}`, dto);
  }

  deleteResultType(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`quiz/result-types/${id}`);
  }

  // Admin — questions
  addQuestion(quizId: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>(`quiz/${quizId}/questions`, dto);
  }

  updateQuestion(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`quiz/questions/${id}`, dto);
  }

  deleteQuestion(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`quiz/questions/${id}`);
  }
}
