import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Clock, DollarSign, MapPin } from "lucide-react";
import { Job } from "@/types";

interface JobCardProps {
  job: Job;
  userType: 'client' | 'worker';
}

export function JobCard({ job, userType }: JobCardProps) {
  const isClient = userType === 'client';
  const detailLink = isClient ? `/client/jobs/${job.id}` : `/worker/jobs/${job.id}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-secondary mb-2">
            <Link href={detailLink} className="hover:text-primary transition-colors">
              {job.title}
            </Link>
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={16} />
              {new Date(job.createdAt.seconds * 1000).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={16} />
              {job.budget.toLocaleString()}円
            </span>
            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
              プロジェクト
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            job.status === 'open' ? (job.proposalCount > 0 ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800') :
            job.status === 'filled' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {job.status === 'open' ? (job.proposalCount > 0 ? '選考中' : '募集中') :
             job.status === 'filled' ? '募集終了' :
             job.status === 'closed' ? '完了' : 'キャンセル'}
          </span>
        </div>
      </div>
      
      <p className="text-gray-600 mb-4 line-clamp-2">
        {job.description}
      </p>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Client Info (if needed) */}
        </div>
        <Link href={detailLink}>
          <Button variant="outline" size="sm">
            詳細を見る
          </Button>
        </Link>
      </div>
    </Card>
  );
}
