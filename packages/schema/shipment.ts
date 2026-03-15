/** 出荷データ */
export interface Shipment {
  issueNo: string
  supplier: string
  partNo: string
  partName: string
  quantity: number
  dueDate: string
}
