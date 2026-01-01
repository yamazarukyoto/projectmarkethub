"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Contract } from "@/types";
import Link from "next/link";

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const q = query(collection(db, "contracts"), orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(q);
        const contractList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
        setContracts(contractList);
      } catch (error) {
        console.error("Error fetching contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">契約管理</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link href={`/admin/contracts/${contract.id}`} className="hover:underline text-blue-600">
                    {contract.id.substring(0, 8)}...
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contract.jobTitle}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.clientId.substring(0, 8)}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.workerId.substring(0, 8)}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">¥{contract.amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    contract.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    contract.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                    contract.status === 'disputed' ? 'bg-red-100 text-red-800' :
                    contract.cancelRequestedBy ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {contract.cancelRequestedBy ? `${contract.status} (キャンセル申請中)` : contract.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
