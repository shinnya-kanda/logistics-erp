/** 物流ERP 共通型定義 */

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export type Id = string | number;
