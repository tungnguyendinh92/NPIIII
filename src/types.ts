export interface ProjectPart {
  id: string;
  project: string;
  partToolDes: string;
  picture?: string;
  partNo: string;
  toolNo: string;
  molder: string;
  faLocation: string;
  toolingStartDate: string;
  t1Date: string;
  tfDate: string;
  currentStage: string;
  tfTx: string;
  currentStageFinishDate: string;
  nextStage: string;
  latestStatusUpdate: string;
  threeDIssue?: string;
  toolDFM?: string;
  t1?: string;
  t2?: string;
  t3?: string;
  t4?: string;
  t5?: string;
  t6?: string;
  odm: string;
  pde: string;
  pe: string;
  pte: string;
  beta: string;
  pilotRun: string;
  fai: string;
  xf: string;
  threeDDate?: string;
  dfmDate?: string;
  modelStatus?: string;
  uid?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
