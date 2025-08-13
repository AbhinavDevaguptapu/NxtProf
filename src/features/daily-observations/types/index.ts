export interface Observation {
  id: string;
  userId: string;
  observationText: string;
  observationDate: {
    _seconds: number;
    _nanoseconds: number;
  };
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  authorName: string;
}
