import React from "react";
import { LearningPointsList } from "@/features/learning-hours/components/LearningPointsList";
import { useLearningPoints } from "@/features/learning-hours/hooks/useLearningPoints";
import { useLearningHourSession } from "@/features/learning-hours/hooks/useLearningHourSession";

const CoAdminAddLearningPoints: React.FC = () => {
  const { learningHour, todayDocId } = useLearningHourSession();
  const {
    learningPoints,
    isLoading: isLoadingPoints,
    addLearningPoint,
    updateLearningPoint,
    deleteLearningPoint,
  } = useLearningPoints(todayDocId);

  const isSessionEnded = learningHour?.status === "ended";

  const handleAddPoint = (data: any) => {
    addLearningPoint(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Add Learning Points
          </h1>
          <p className="text-muted-foreground">
            Log your learning activities and manage attendance.
          </p>
        </div>
      </div>

      <div className="w-full">
        <LearningPointsList
          points={learningPoints}
          isLoading={isLoadingPoints}
          onAddPoint={handleAddPoint}
          onUpdatePoint={updateLearningPoint}
          onDeletePoint={deleteLearningPoint}
          isDayLocked={isSessionEnded}
        />
      </div>
    </div>
  );
};

export default CoAdminAddLearningPoints;
