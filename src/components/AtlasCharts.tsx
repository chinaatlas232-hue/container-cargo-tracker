import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PortSummaryItem {
  الميناء: string;
  'Sum of الطرود': number;
  'Count of الحاويات': number;
}

export const PortPackagesChart: React.FC<{ data: PortSummaryItem[] }> = ({ data }) => {
  return (
    <div className="w-full bg-[#111827] p-4 rounded-xl border border-slate-700 my-4 text-white">
      <h4 className="text-base font-bold text-slate-100 mb-3 text-right">
        مقارنة الحاويات والطرود حسب الميناء
      </h4>
      <div className="h-[380px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="الميناء" stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 13 }} />
            <YAxis stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 13 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#fff', borderRadius: '8px' }}
              formatter={(value: any, name: any) => [Number(value).toLocaleString(), name]}
            />
            <Legend />
            <Bar dataKey="Sum of الطرود" fill="#a3e635" name="إجمالي الطرود" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Count of الحاويات" fill="#38bdf8" name="عدد الحاويات" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface CustomerTopItem {
  الكود: string;
  '🚢 شحن بحري (RQ)': number;
  '✈️ شحن جوي (RA)': number;
  total: number;
}

export const TopCustomersChart: React.FC<{ data: CustomerTopItem[] }> = ({ data }) => {
  return (
    <div className="w-full bg-[#111827] p-4 rounded-xl border border-slate-700 my-4 text-white">
      <h4 className="text-white font-bold text-[22px] mb-3 text-right">
        أفضل 20 زبون (مقارنة الشحن الجوي والبحري حسب عدد الطرود)
      </h4>
      <div className="h-[520px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#e5e7eb' }} />
            <YAxis
              dataKey="الكود"
              type="category"
              stroke="#9ca3af"
              tick={{ fill: '#e5e7eb', fontSize: 12, fontWeight: 600 }}
              width={75}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#fff', borderRadius: '8px' }}
              formatter={(value: any, name: any) => [Number(value).toLocaleString(), name]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="🚢 شحن بحري (RQ)" stackId="a" fill="#38bdf8" name="🚢 شحن بحري (RQ)" />
            <Bar dataKey="✈️ شحن جوي (RA)" stackId="a" fill="#f43f5e" name="✈️ شحن جوي (RA)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface AgingChartItem {
  الكود: string;
  'أقل من 30 يوماً': number;
  'من 30 إلى 60 يوماً': number;
  'من 61 إلى 90 يوماً': number;
  'أكثر من 90 يوماً (يتضمن +95 يوم)': number;
  total: number;
}

export const AgingDebtChart: React.FC<{ data: AgingChartItem[] }> = ({ data }) => {
  return (
    <div className="w-full bg-[#111827] p-4 rounded-xl border border-slate-700 my-4 text-white">
      <h4 className="text-base font-bold text-slate-100 mb-3 text-right">
        تحليل أعمار الديون المتأخرة حسب فترات التأخير (محدث لتشمل فئات الـ 95 يوماً)
      </h4>
      <div className="h-[520px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#e5e7eb' }} />
            <YAxis
              dataKey="الكود"
              type="category"
              stroke="#9ca3af"
              tick={{ fill: '#e5e7eb', fontSize: 12, fontWeight: 600 }}
              width={75}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#fff', borderRadius: '8px' }}
              formatter={(value: any, name: any) => [`$${Number(value).toLocaleString()}`, name]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="أقل من 30 يوماً" stackId="a" fill="#38bdf8" name="أقل من 30 يوماً" />
            <Bar dataKey="من 30 إلى 60 يوماً" stackId="a" fill="#fbbf24" name="من 30 إلى 60 يوماً" />
            <Bar dataKey="من 61 إلى 90 يوماً" stackId="a" fill="#f97316" name="من 61 إلى 90 يوماً" />
            <Bar dataKey="أكثر من 90 يوماً (يتضمن +95 يوم)" stackId="a" fill="#f43f5e" name="أكثر من 90 يوماً (يتضمن +95 يوم)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
