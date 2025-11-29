"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Job } from "@/types";

interface TaskWorkspaceProps {
  job: Job;
  onSubmit: (answers: any[]) => Promise<void>;
}

export function TaskWorkspace({ job, onSubmit }: TaskWorkspaceProps) {
  const [answers, setAnswers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!job.task?.questions) return <div>設問がありません</div>;

  const handleAnswerChange = (index: number, value: any) => {
    const newAnswers = [...answers];
    newAnswers[index] = { questionId: index, value };
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answers.length !== job.task!.questions.length) {
      alert("全ての設問に回答してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(answers);
    } catch (error) {
      console.error("Error submitting task:", error);
      alert("提出に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>タスク作業</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {job.task.questions.map((q, index) => (
            <div key={index} className="space-y-2">
              <label className="block font-medium text-gray-700">
                Q{index + 1}. {q.text}
              </label>
              
              {q.type === "text" && (
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 h-24 focus:border-primary focus:ring-1 focus:ring-primary"
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  required
                />
              )}

              {q.type === "radio" && q.options && (
                <div className="space-y-2">
                  {q.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center">
                      <input
                        type="radio"
                        name={`q-${index}`}
                        id={`q-${index}-${optIndex}`}
                        value={option}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="mr-2"
                        required
                      />
                      <label htmlFor={`q-${index}-${optIndex}`}>{option}</label>
                    </div>
                  ))}
                </div>
              )}

              {q.type === "checkbox" && q.options && (
                <div className="space-y-2">
                  {q.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center">
                      <input
                        type="checkbox"
                        name={`q-${index}`}
                        id={`q-${index}-${optIndex}`}
                        value={option}
                        onChange={(e) => {
                          const currentValues = answers[index]?.value || [];
                          let newValues;
                          if (e.target.checked) {
                            newValues = [...currentValues, option];
                          } else {
                            newValues = currentValues.filter((v: string) => v !== option);
                          }
                          handleAnswerChange(index, newValues);
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`q-${index}-${optIndex}`}>{option}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "送信中..." : "作業を完了して提出する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
