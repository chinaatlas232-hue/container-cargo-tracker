import React, { useState } from 'react';
import { HelpCircle, Satellite, Server, Cpu, Clock, Check, Copy, X, Terminal, Code } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const pythonCronCode = `# ==============================================================================
# سكربت بايثون للتحديث الأوتوماتيكي اليومي لمواقع الحاويات (Daily Automated Sync)
# ==============================================================================
import requests
import schedule
import time
from datetime import datetime

# قائمة أرقام الحاويات الخاصة بك (ISO 6346)
CONTAINER_NUMBERS = ["MSCU7482910", "COSU8391024", "MAEU6192847"]

# إعداد واجهة برمجة الخط الملاحي أو نظام AIS البحري
TRACKING_API_URL = "https://api.marinetraffic.com/v1/container-tracking" # أو API الخط الملاحي
API_KEY = "YOUR_SECRET_API_KEY"

def update_containers_daily():
    """هذه الدالة تُستدعى أوتوماتيكياً كل يوم لتحديث الإحداثيات وحفظها"""
    print(f"[{datetime.now()}] بدء التحديث الأوتوماتيكي اليومي للحاويات...")
    
    for container_id in CONTAINER_NUMBERS:
        try:
            # 1. إرسال طلب استعلام إلى الـ API
            response = requests.get(
                f"{TRACKING_API_URL}/{container_id}",
                headers={"Authorization": f"Bearer {API_KEY}"}
            )
            data = response.json()
            
            # 2. استخراج الإحداثيات الحالية والموقع واسم السفينة
            lat = data.get("latitude")
            lng = data.get("longitude")
            vessel = data.get("vessel_name")
            status = data.get("status")
            eta = data.get("estimated_arrival")
            
            print(f" الحاوية {container_id} على متن {vessel}: الإحداثيات ({lat}, {lng}) | الحالة: {status}")
            
            # 3. حفظ الموقع الجديد في قاعدة البيانات وتحديث الخريطة
            save_to_database(container_id, lat, lng, status, eta)
            
        except Exception as e:
            print(f"خطأ أثناء تحديث الحاوية {container_id}: {e}")

# جدولة التشغيل الأوتوماتيكي يومياً في تمام الساعة 08:00 صباحاً
schedule.every().day.at("08:00").do(update_containers_daily)

print(" محرك التحديث التلقائي يعمل في الخلفية... سيتم الفحص كل يوم في الساعة 08:00 صباحاً")
while True:
    schedule.run_pending()
    time.sleep(60)
`;

  const nodeCronCode = `// ==============================================================================
// سكربت Node.js للتحديث الأوتوماتيكي اليومي عبر Cron Job
// ==============================================================================
import cron from 'node-cron';
import axios from 'axios';

const CONTAINERS = ['MSCU7482910', 'COSU8391024', 'MAEU6192847'];

// جدولة التحديث اليومي في الساعة 06:00 صباحاً كل يوم (Cron: 0 6 * * *)
cron.schedule('0 6 * * *', async () => {
  console.log('[تحديث يومي] جلب مواقع الحاويات الحالية عبر AIS & Carrier APIs...');
  
  for (const containerId of CONTAINERS) {
    try {
      const res = await axios.get(\`https://api.vesseltracker.com/containers/\${containerId}\`);
      const { lat, lng, speed, currentPort, eta } = res.data;
      
      console.log(\` الحاوية \${containerId} تم رصدها عند (\${lat}, \${lng})\`);
      // تحديث السجلات وتنبيه المستخدم
    } catch (err) {
      console.error(\`فشل تحديث \${containerId}\`, err.message);
    }
  }
});
`;

  const handleCopy = (code: string, sectionId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                دليل معرفة مواقع الحاويات والتحديث التلقائي اليومي
              </h3>
              <p className="text-xs text-slate-500">
                إجابة مفصلة: كيف يتم تحديد موقع الحاوية في العالم الحقيقي وكيف تبرمج التحديث اليومي؟
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Part 1: How container locations are found */}
          <section className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Satellite className="w-4 h-4 text-blue-600" />
              1. كيف يعرف النظام موقع الحاوية البحرية أو البرية؟
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              الحاوية في البحر لا تملك غالباً محركاً خاصاً، بل تتنقل على متن سفينة نقل حاويات ضخمة، ويتم تحديد موقعها بدقة
              من خلال إحدى ثلاث طرق قياسية عالمياً:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                  <Satellite className="w-4 h-4" />
                  <span>نظام AIS للسفن</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  السفينة الحاملة للحاوية تبث إشارات GPS عبر راديو وأقمار صناعية (AIS) كل بضع دقائق. بمعرفة اسم السفينة ورقم
                  الرحلة نصل لموقع الحاوية الحي في وسط المحيط.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <Server className="w-4 h-4" />
                  <span>واجهات APIs للخطوط الملاحية</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  توفر شركات مثل Maersk و MSC و COSCO و CMA CGM واجهات برمجية رسمية (REST API / EDI) تستعلم برقم الحاوية
                  (مثل MSCU1234567) فتعطيك آخر ميناء وحالة الرسو والإبحار.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                  <Cpu className="w-4 h-4" />
                  <span>الحاويات الذكية (Smart IoT)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  تُزود الحاويات الحديثة بحساسات تعمل بالطاقة الشمسية وشريحة قمر صناعي تبث موقعها، درجة حرارتها (للمبردات)،
                  وحالة قفل الأبواب بشكل مباشر ومستقل.
                </p>
              </div>
            </div>
          </section>

          {/* Part 2: How daily automated update works */}
          <section className="space-y-3 border-t border-slate-100 pt-5">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              2. كيف تبرمج التحديث الأوتوماتيكي كل يوم (Daily Cron Job)؟
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              لعمل تحديث تلقائي يومي، نستخدم <span className="font-mono text-blue-600 font-bold">Cron Job</span> أو مجدول
              سحابي (مثل Google Cloud Scheduler أو GitHub Actions)، بحيث ينفذ الكود في وقت محدد (مثلاً كل يوم في الساعة
              8:00 صباحاً)، فيطلب المواقع ويحفظها ويحدث الخريطة ويرسل إشعاراً لجهازك أو بيتك!
            </p>

            {/* Python Code Snippet */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs shadow-inner">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <span className="font-mono font-bold text-slate-300 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  كود بايثون كامل للجدولة اليومية (daily_tracker.py)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(pythonCronCode, 'py')}
                  className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {copiedSection === 'py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'py' ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto text-left leading-relaxed" dir="ltr">
                {pythonCronCode}
              </pre>
            </div>

            {/* Node.js Code Snippet */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs mt-3 shadow-inner">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <span className="font-mono font-bold text-slate-300 flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-sky-400" />
                  كود Node.js مجدول بمكتبة node-cron
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(nodeCronCode, 'node')}
                  className="flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                >
                  {copiedSection === 'node' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'node' ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-sky-400 overflow-x-auto text-left leading-relaxed" dir="ltr">
                {nodeCronCode}
              </pre>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
          >
            إغلاق الدليل
          </button>
        </div>
      </div>
    </div>
  );
};
