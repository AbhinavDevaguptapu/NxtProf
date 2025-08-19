export interface Feedback {
    id: string;
    projectOrTask: string;
    workEfficiency: number;
    easeOfWork: number;
    remarks: string;
    submittedAt: string;
    finalRating?: number;
}

export interface Employee {
    id: string;
    name: string;
}
