import React, { useState } from 'react';
import { AtlasRow } from '../utils/atlasOceanData';
import { Printer, X, FileText, CheckSquare, Calendar, Building, Package } from 'lucide-react';

interface YardInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableShipments: string[];
  initialShipment?: string;
  allRows: AtlasRow[];
}

export const YardInventoryModal: React.FC<YardInventoryModalProps> = ({
  isOpen,
  onClose,
  availableShipments,
  initialShipment,
  allRows,
}) => {
  const [selectedShipment, setSelectedShipment] = useState<string>(() => {
    if (initialShipment && initialShipment !== 'الكل') return initialShipment;
    // Prefer actual physical container (e.g. BHCU512630) if available
    const preferred = availableShipments.find(s => s.startsWith('BHCU') || s === 'BHCU512630');
    return preferred || availableShipments.find(s => s !== 'الكل' && !s.startsWith('RQ')) || 'BHCU512630';
  });

  if (!isOpen) return null;

  // Filter rows matching this shipment/container
  const matchingRows = allRows.filter((r) => {
    const cont = String(r['رقم الحاوية'] || '').trim();
    return cont.toLowerCase() === selectedShipment.toLowerCase();
  });

  // Calculate totals
  const totalCartons = matchingRows.reduce((acc, r) => acc + (r['عدد الكارتون'] || 0), 0);
  const totalWeight = matchingRows.reduce((acc, r) => acc + (r['الوزن'] || 0), 0);
  const todayFormatted = new Date().toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1050] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 w-full max-w-4xl rounded-none md:rounded-2xl shadow-2xl flex flex-col max-h-screen md:max-h-[92vh] overflow-hidden text-slate-900">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-base">توليد وطباعة نموذج جرد الساحة والمستودع</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 font-semibold">اختر الشحنة / الحاوية:</label>
              <select
                value={selectedShipment}
                onChange={(e) => setSelectedShipment(e.target.value)}
                className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableShipments.filter(s => s !== 'الكل').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية (Print)</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div id="yard-inventory-printable" className="flex-1 overflow-y-auto p-6 md:p-10 bg-white text-slate-900 font-sans" dir="rtl">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
            <div className="flex items-center justify-between mb-2">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-600 block">المملكة الأردنية الهاشمية / جمهورية العراق</span>
                <span className="text-[11px] text-slate-500">قسم المستودعات والساحة الجمركية</span>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  أطلس المحيط للتجارة العامة
                </h1>
                <h2 className="text-base font-bold text-slate-700 mt-1">
                  نموذج جرد الساحة والمستودع الرسمي
                </h2>
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-600 block">ATLAS OCEAN CO.</span>
                <span className="text-[11px] text-slate-500">Warehouse & Yard Inventory</span>
              </div>
            </div>

            {/* Shipment Metadata Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-300 text-xs text-right mt-4">
              <div>
                <span className="text-slate-500 block text-[11px]">رقم الشحنة / الحاوية:</span>
                <span className="font-bold text-blue-700 text-sm font-mono">{selectedShipment}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">تاريخ الجرد:</span>
                <span className="font-bold text-slate-800">{todayFormatted}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">إجمالي عدد الطرود (الكارتون):</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">{totalCartons} طرد</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">موقع الفحص:</span>
                <span className="font-bold text-slate-800">ساحة التفريغ والمستودع الرئيسي</span>
              </div>
            </div>
          </div>

          {/* Formatted Table: التسلسل، الكود، العنوان، عدد الطرود */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-slate-400 text-xs text-center">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
                  <th className="border border-slate-400 p-2 w-14">التسلسل</th>
                  <th className="border border-slate-400 p-2 w-32">الكود (Code)</th>
                  <th className="border border-slate-400 p-2">العنوان / العلامة الشاحنة (Shipping Mark)</th>
                  <th className="border border-slate-400 p-2 w-28">عدد الطرود (Ctns)</th>
                  <th className="border border-slate-400 p-2 w-28">الوزن التقريبي (kg)</th>
                  <th className="border border-slate-400 p-2 w-36">حالة الفحص والمطابقة</th>
                </tr>
              </thead>
              <tbody>
                {matchingRows.length > 0 ? (
                  matchingRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="border border-slate-300 p-2 font-bold font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold text-blue-700">
                        {row['code'] || row['الكود'] || '-'}
                      </td>
                      <td className="border border-slate-300 p-2 font-semibold text-right pr-3">
                        {row['Shipping mark'] || row['العنوان'] || 'بضاعة عامة'}
                      </td>
                      <td className="border border-slate-300 p-2 font-bold font-mono text-emerald-800">
                        {row['عدد الكارتون'] ? `${row['عدد الكارتون']} كارتون` : '-'}
                      </td>
                      <td className="border border-slate-300 p-2 font-mono">
                        {row['الوزن'] ? `${row['الوزن']} kg` : '-'}
                      </td>
                      <td className="border border-slate-300 p-2 text-slate-500 font-mono text-[11px]">
                        [  ] مطابق وسليم
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="border border-slate-300 p-6 text-center text-slate-500 font-medium">
                      لا توجد طرود مسجلة حالياً برقم الشحنة المختار ({selectedShipment}).
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-500">
                  <td colSpan={3} className="border border-slate-300 p-2 text-right pr-4">
                    المجموع الكلي لشحنة ({selectedShipment})
                  </td>
                  <td className="border border-slate-300 p-2 font-mono text-emerald-800 font-bold">
                    {totalCartons} كارتون
                  </td>
                  <td className="border border-slate-300 p-2 font-mono font-bold">
                    {totalWeight > 0 ? `${totalWeight.toLocaleString()} kg` : '-'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center text-[10px] text-slate-600">
                    تم تدقيق العدد والمطابقة
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom Signatures & Sign-off Section */}
          <div className="pt-6 border-t-2 border-dashed border-slate-400 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 min-w-[180px]">اسم أمين المستودع / القائم بالجرد:</span>
                  <span className="flex-1 border-b border-slate-500 border-dotted h-5"></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 min-w-[180px]">توقيع مسؤول الساحة:</span>
                  <span className="flex-1 border-b border-slate-500 border-dotted h-5"></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 min-w-[180px]">التاريخ ووقت الاعتماد:</span>
                  <span className="flex-1 border-b border-slate-500 border-dotted h-5"></span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 min-w-[180px]">اسم مدقق الجودة والسلامة:</span>
                  <span className="flex-1 border-b border-slate-500 border-dotted h-5"></span>
                </div>
                <div className="flex items-center justify-between border border-slate-400 rounded-lg p-3 bg-slate-50 h-24">
                  <span className="font-bold text-slate-600 text-xs">الختم الرسمي - أطلس المحيط للتجارة العامة:</span>
                  <div className="w-20 h-20 border border-dashed border-slate-400 rounded flex items-center justify-center text-[10px] text-slate-400">
                    (مكان الختم)
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-400 border-t border-slate-200 pt-3">
              تم إصدار هذا النموذج إلكترونياً عبر نظام إدارة وتتبع الشحنات - أطلس المحيط للتجارة العامة
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
