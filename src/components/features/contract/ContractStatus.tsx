import { Contract } from "@/types";
import { CheckCircle, Clock, AlertCircle, FileText, DollarSign } from "lucide-react";

interface ContractStatusProps {
  status: Contract['status'];
}

export function ContractStatus({ status }: ContractStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending_signature':
        return {
          label: '契約合意待ち',
          icon: FileText,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          description: 'ワーカーの契約合意を待っています'
        };
      case 'waiting_for_escrow':
        return {
          label: '仮払い待ち',
          icon: Clock,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          description: 'クライアントの仮払い手続きを待っています'
        };
      case 'escrow':
        return {
          label: '作業中',
          icon: FileText,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          description: '仮払いが完了しました。業務を開始してください'
        };
      case 'in_progress':
        return {
          label: '修正対応中',
          icon: AlertCircle,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          description: '修正依頼があります。内容を確認して対応してください'
        };
      case 'submitted':
        return {
          label: '検収待ち',
          icon: CheckCircle,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          description: '納品報告済みです。クライアントの検収を待っています'
        };
      case 'completed':
        return {
          label: '完了',
          icon: DollarSign,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          description: '検収が完了し、報酬が確定しました'
        };
      case 'disputed':
        return {
          label: 'トラブル中',
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          description: '運営事務局が対応中です'
        };
      case 'cancelled':
        return {
          label: 'キャンセル',
          icon: AlertCircle,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          description: 'この契約はキャンセルされました'
        };
      default:
        return {
          label: '不明',
          icon: AlertCircle,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          description: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-start p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className={`p-2 rounded-full bg-white ${config.color} mr-4`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className={`font-bold text-lg ${config.color} mb-1`}>
          {config.label}
        </h4>
        <p className="text-gray-600 text-sm">
          {config.description}
        </p>
      </div>
    </div>
  );
}
