import React, { useEffect, useRef } from 'react';
import { Printer, Download, FileSpreadsheet, X, FileText, ExternalLink, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PagePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any>[];
  filename: string;
  containerFilter?: string;
}

export const PagePrintModal: React.FC<PagePrintModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  filename,
  containerFilter = 'الكل',
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  const todayFormatted = new Date().toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Extract columns (skip internal metadata)
  const columns = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0] || {}).filter(
      (k) =>
        !['id', '_id', 'actions', 'التتبع العلمي المباشر'].includes(k) &&
        !k.startsWith('__')
    );
  }, [data]);

  // Attempt direct print when opened
  const handleDirectPrint = () => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn('Direct print blocked by sandbox:', e);
      // Fallback: trigger print via hidden iframe
      printViaHiddenIframe();
    }
  };

  // Hidden iframe printer (bypasses some parent iframe restrictions)
  const printViaHiddenIframe = () => {
    if (!printableRef.current) return;
    try {
      const existingFrame = document.getElementById('atlas-print-hidden-frame');
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'atlas-print-hidden-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
            <head>
              <meta charset="UTF-8" />
              <title>${title} - أطلس المحيط للتجارة العامة</title>
              <style>
                @page { size: A4 landscape; margin: 8mm; }
                body { font-family: 'Cairo', sans-serif, Tahoma, Arial; direction: rtl; margin: 0; padding: 12px; color: #000; background: #fff; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
                th { background-color: #0f172a; color: #fff; border: 1px solid #334155; padding: 6px; font-weight: bold; }
                td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
                .meta-box { display: flex; justify-content: space-between; font-size: 12px; margin-top: 8px; background: #f1f5f9; padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 4px; }
              </style>
            </head>
            <body>
              ${printableRef.current.innerHTML}
              <script>
                window.onload = function() {
                  window.focus();
                  try { window.print(); } catch(e) {}
                };
              </script>
            </body>
          </html>
        `);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print failed:', e);
          }
        }, 300);
      }
    } catch (err) {
      console.warn('Hidden iframe print error:', err);
    }
  };

  // Download standalone HTML file that opens and prints in any external browser/tab
  const handleDownloadPrintableHTML = () => {
    if (!printableRef.current) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${title} - أطلس المحيط للتجارة العامة</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: 'Cairo', sans-serif, Tahoma, Arial; direction: rtl; margin: 20px; color: #0f172a; background: #fff; }
            .btn-print { background: #1e3a8a; color: #fff; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-bottom: 16px; }
            @media print { .btn-print { display: none; } }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th { background-color: #0f172a; color: #fff; border: 1px solid #334155; padding: 7px; font-weight: bold; text-align: center; }
            td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px; text-align: center; }
            .meta-box { display: flex; justify-content: space-between; font-size: 12px; margin-top: 8px; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">🖨️ اضغط هنا لتنفيذ أمر الطباعة (Print Now)</button>
          ${printableRef.current.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename || 'تقرير_أطلس_المحيط_للتجارة_العامة'}_جاهز_للطباعة.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename || 'تقرير_أطلس'}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 md:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-300 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Action Toolbar (Hidden in Print) */}
        <div className="no-print p-3 md:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm md:text-base leading-none">
                جاهزية وطباعة الصفحة: {title}
              </h3>
              <span className="text-[11px] text-slate-400">
                إجمالي السجلات: {data.length} سجل | الحاوية: {containerFilter}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handleDirectPrint}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ طباعة فورية (Print)</span>
            </button>

            {/* Download Standalone Printable HTML */}
            <button
              type="button"
              onClick={handleDownloadPrintableHTML}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تنزيل نسخة مستقلة تفتح وتطبع مباشرة بأي متصفح"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>📄 تنزيل نسخة الطباعة (HTML)</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📊 Excel</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100">
          <div
            ref={printableRef}
            id="atlas-page-printable-document"
            className="bg-white p-6 md:p-10 rounded-xl border border-slate-300 shadow-sm max-w-5xl mx-auto text-slate-900 font-sans"
            dir="rtl"
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
              <div className="flex items-center justify-between mb-2">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-600 block">
                    المملكة الأردنية الهاشمية / جمهورية العراق
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    قسم الشحن اللوجستي والتخليص الجمركي
                  </span>
                </div>
                <div className="text-center">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    أطلس المحيط للتجارة العامة
                  </h1>
                  <h2 className="text-sm md:text-base font-bold text-blue-800 mt-1">
                    {title}
                  </h2>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-600 block">
                    ATLAS OCEAN SHIPPING CO.
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Customs & Cargo Department
                  </span>
                </div>
              </div>

              {/* Metadata strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-right mt-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">تاريخ إصدار التقرير:</span>
                  <span className="font-bold text-slate-800">{todayFormatted}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">الحاوية المحددة:</span>
                  <span className="font-bold text-blue-700 font-mono">{containerFilter}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">عدد القيود المشمولة:</span>
                  <span className="font-bold text-emerald-700 font-mono">{data.length} قيد</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">حالة التقرير:</span>
                  <span className="font-bold text-slate-800">معتمد ومطابق للحسابات</span>
                </div>
              </div>
            </div>

            {/* Document Table */}
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="border border-slate-700 p-2 w-10">#</th>
                    {columns.map((col) => (
                      <th key={col} className="border border-slate-700 p-2">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => {
                    const isTotalRow = Object.values(row).some((v) =>
                      String(v || '').toLowerCase().includes('total') ||
                      String(v || '').includes('الإجمالي')
                    );
                    return (
                      <tr
                        key={idx}
                        className={
                          isTotalRow
                            ? 'bg-amber-100 font-black text-slate-900 border-t-2 border-slate-900'
                            : idx % 2 === 0
                            ? 'bg-white hover:bg-slate-50'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }
                      >
                        <td className="border border-slate-300 p-1.5 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        {columns.map((col) => {
                          const val = row[col];
                          const strVal = val !== undefined && val !== null ? String(val) : '-';
                          return (
                            <td
                              key={col}
                              className={`border border-slate-300 p-1.5 ${
                                isTotalRow ? 'font-black text-sm' : ''
                              }`}
                            >
                              {strVal}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Document Footer */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
              <div>
                <span className="block font-bold">توقيع المسؤول / المحاسب:</span>
                <span className="block mt-4 border-b border-dashed border-slate-400 w-36"></span>
              </div>
              <div className="text-center font-bold text-slate-500 text-[11px]">
                نظام أطلس المحيط للتجارة العامة - وثيقة رسمية معتمدة
              </div>
              <div>
                <span className="block font-bold">ختم الشركة:</span>
                <span className="block mt-4 border-b border-dashed border-slate-400 w-36"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
