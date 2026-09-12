import React, { useMemo, useState } from 'react';

interface AtlasCustomTableProps {
  data: Record<string, any>[];
  isSponsorsPivot?: boolean;
  isAgingReport?: boolean;
  onContainerClick?: (containerNo: string) => void;
  rowsPerPage?: number;
}

export const AtlasCustomTable: React.FC<AtlasCustomTableProps> = ({
  data,
  isSponsorsPivot = false,
  isAgingReport = false,
  onContainerClick,
  rowsPerPage = 100,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Compute duplicated codes
  const duplicatedCodes = useMemo(() => {
    if (!data || data.length === 0) return new Set<string>();
    const codeKey = Object.keys(data[0] || {}).find((k) =>
      ['code', 'الكود', 'كود'].includes(k.trim().toLowerCase())
    );
    if (!codeKey) return new Set<string>();
    const counts = new Map<string, number>();
    for (const r of data) {
      const c = String(r[codeKey] || '').trim();
      if (c && !c.toLowerCase().includes('total')) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    }
    const dupes = new Set<string>();
    counts.forEach((count, code) => {
      if (count > 1) dupes.add(code);
    });
    return dupes;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-slate-800 text-slate-300 rounded-lg text-center my-4 font-semibold">
        لا توجد بيانات للعرض.
      </div>
    );
  }

  // Remove existing total rows to avoid duplicates in numbering
  const nonTotalRows: any[] = [];
  const totalRows: any[] = [];

  data.forEach((r) => {
    const isTotal = Object.values(r).some((v) => {
      const s = String(v || '').trim().toLowerCase();
      return s.includes('grand total') || s.includes('grandtotal') || s.includes('الإجمالي الكلي');
    });
    if (isTotal) totalRows.push(r);
    else nonTotalRows.push(r);
  });

  // Exclude redundant sequence columns (No.) and excluded tracking columns
  const allColumns = Object.keys(data[0] || {}).filter((c) => {
    const lower = c.trim().toLowerCase();
    if (c === 'التسلسل' || lower === 'no.' || lower === 'no' || lower === 'no .') return false;
    if (c.includes('التتبع العلمي المباشر')) return false;
    return true;
  });
  const codeKey = allColumns.find((c) => ['code', 'الكود', 'كود'].includes(c.trim().toLowerCase()));
  const sponsorKey = allColumns.find((c) => c.includes('كفيل'));

  const totalPages = Math.max(1, Math.ceil(nonTotalRows.length / rowsPerPage));
  const displayedNonTotal = rowsPerPage < nonTotalRows.length 
    ? nonTotalRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage) 
    : nonTotalRows;

  const rowsToRender = [...displayedNonTotal, ...totalRows];

  return (
    <div className="w-full my-4 overflow-x-auto">
      {/* Pagination controls with red buttons */}
      {nonTotalRows.length > rowsPerPage && (
        <div className="no-print flex items-center justify-between bg-slate-800 text-white p-2.5 rounded-t-lg text-sm mb-1 border border-slate-700">
          <div className="text-slate-300">
            عرض {((currentPage - 1) * rowsPerPage) + 1} إلى {Math.min(currentPage * rowsPerPage, nonTotalRows.length)} من إجمالي {nonTotalRows.length} سجل
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              السابق
            </button>
            <span className="text-xs font-mono font-bold px-2">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      <table className="custom-html-table w-full">
        <thead>
          <tr>
            {!isSponsorsPivot && <th>التسلسل</th>}
            {allColumns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowsToRender.map((row, rowIdx) => {
            const isRowTotal = Object.values(row).some((val) => {
              if (val === null || val === undefined) return false;
              const valS = String(val).trim().toLowerCase();
              return valS.includes('grand total') || valS.includes('grandtotal') || valS.includes('الإجمالي الكلي');
            });

            const sponsorVal = sponsorKey ? String(row[sponsorKey] || '') : '';
            const isNotArrived = sponsorVal.includes('لم تصل بعد');

            const rowCodeVal = codeKey ? String(row[codeKey] || '').trim() : '';
            const isCodeDuplicated = Boolean(codeKey && duplicatedCodes.has(rowCodeVal));

            const seqNum = isRowTotal ? '' : (currentPage - 1) * rowsPerPage + rowIdx + 1;

            return (
              <tr
                key={rowIdx}
                style={
                  isRowTotal
                    ? { backgroundColor: '#374151', color: '#ffffff', fontWeight: 'bold' }
                    : undefined
                }
              >
                {!isSponsorsPivot && (
                  <td
                    style={
                      isRowTotal
                        ? { backgroundColor: '#374151', color: '#ffffff', fontWeight: 'bold' }
                        : undefined
                    }
                  >
                    {seqNum || '-'}
                  </td>
                )}

                {allColumns.map((col, colIdx) => {
                  const val = row[col];
                  const colStr = String(col);
                  const valStr = val === null || val === undefined ? '' : String(val).trim();

                  let numericVal: number | null = null;
                  try {
                    const cleanStr = valStr.replace(/¥/g, '').replace(/\$/g, '').replace(/,/g, '');
                    if (cleanStr !== '' && !isNaN(Number(cleanStr))) {
                      numericVal = parseFloat(cleanStr);
                    }
                  } catch (e) {
                    numericVal = null;
                  }

                  let cellStyle: React.CSSProperties = {};
                  const isSpecialFinancialCol = ['المجموع', 'الزبون دفع', 'المكتب دفع', 'نقل داخلي'].includes(colStr);

                  if (isRowTotal) {
                    cellStyle = { backgroundColor: '#374151', color: '#ffffff', fontWeight: 'bold' };
                  } else if (isSpecialFinancialCol) {
                    // Very light orange background (bg-orange-50) with white text numbers
                    cellStyle = { backgroundColor: '#fff7ed', color: '#ffffff', fontWeight: 'bold' };
                  } else {
                    if (isCodeDuplicated && col === codeKey) {
                      cellStyle = { backgroundColor: '#fefce8', color: '#713f12', fontWeight: 'bold' };
                    } else if (isSponsorsPivot) {
                      cellStyle = { backgroundColor: '#fdf2f8', color: '#9d174d', fontWeight: 'bold' };
                      if (colIdx < 2) {
                        cellStyle = { backgroundColor: '#ffedd5', color: '#9a3412', fontWeight: 'bold' };
                      }
                    } else {
                      if (numericVal !== null && numericVal > 0 && colStr !== 'التسلسل') {
                        // Lightest pastel pink (bg-pink-50)
                        cellStyle = { backgroundColor: '#fdf2f8', color: '#9d174d', fontWeight: 'bold' };
                      } else if (isNotArrived) {
                        // Lightest pastel yellow (bg-yellow-50)
                        cellStyle = { backgroundColor: '#fefce8', color: '#713f12' };
                        if (['رقم الحاوية', sponsorKey].includes(colStr)) {
                          cellStyle.fontWeight = 'bold';
                        }
                      } else {
                        if (['رقم الحاوية', sponsorKey].includes(colStr) && valStr && valStr !== '-') {
                          cellStyle = { backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold' };
                        }
                      }
                    }
                  }

                  // Format value
                  let formattedVal: React.ReactNode = valStr;

                  if (val === null || val === undefined || valStr === '' || valStr.toLowerCase() === 'nan') {
                    formattedVal = '-';
                  } else if (colStr === 'نوع النقل') {
                    formattedVal = valStr.includes('بحري') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        🚢 بحري
                      </span>
                    ) : valStr.includes('جوي') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        ✈️ جوي
                      </span>
                    ) : (
                      valStr
                    );
                  } else if (['رقم الحاوية', 'رقم الحاويات'].includes(colStr) && valStr && valStr !== '-' && !isRowTotal) {
                    // Static text only (no link/button) as requested
                    formattedVal = (
                      <span className="font-mono font-bold text-slate-800 text-xs tracking-wide">
                        {valStr}
                      </span>
                    );
                  } else if (numericVal !== null) {
                    const isCurrencyCol = [
                      'مبلغ',
                      'قيمة',
                      'المجموع',
                      'دفع',
                      'سعر',
                      'الاستحصالات',
                      'متبقي',
                      'المتبقي',
                      'نقل داخلي',
                    ].some((kw) => colStr.includes(kw));

                    let rawFormattedNum = '';
                    if (isCurrencyCol || isSponsorsPivot) {
                      if (['المجموع', 'الزبون دفع', 'المكتب دفع', 'نقل داخلي'].includes(colStr)) {
                        rawFormattedNum = Number.isInteger(numericVal)
                          ? numericVal.toLocaleString('en-US')
                          : numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (
                        colStr.includes('¥') ||
                        colStr.includes('يوان') ||
                        valStr.includes('¥') ||
                        (isSponsorsPivot && colStr.includes('الزبون دفع'))
                      ) {
                        rawFormattedNum = `¥${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      } else if (
                        isSponsorsPivot &&
                        ['سعر البيع', 'مبلغ الجمرك', 'متبقي حقيقي'].some((k) => colStr.includes(k))
                      ) {
                        rawFormattedNum = `$ ${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      } else if (isSponsorsPivot && colStr.includes('مجموع الكارتون')) {
                        rawFormattedNum = Number.isInteger(numericVal)
                          ? numericVal.toLocaleString('en-US')
                          : numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (isSponsorsPivot) {
                        rawFormattedNum = Number.isInteger(numericVal)
                          ? numericVal.toLocaleString('en-US')
                          : numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else {
                        rawFormattedNum = `$${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                    } else {
                      rawFormattedNum = Number.isInteger(numericVal)
                        ? numericVal.toLocaleString('en-US')
                        : numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }

                    // For financial columns: explicit white font inside orange badge on light orange background
                    if (isSpecialFinancialCol && !isRowTotal) {
                      formattedVal = (
                        <span className="inline-block bg-amber-600 text-white font-bold font-mono px-2 py-0.5 rounded shadow-xs text-xs">
                          {rawFormattedNum}
                        </span>
                      );
                    } else {
                      formattedVal = rawFormattedNum;
                    }
                  }

                  return (
                    <td key={col} style={cellStyle}>
                      {formattedVal}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
