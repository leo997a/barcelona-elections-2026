import React from 'react';
import { Code, Terminal, Grid } from 'lucide-react';

const Docs: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-4 text-blue-500">التوثيق و API</h1>
        <p className="text-xl text-gray-300 leading-relaxed">
          دليل المطور للتحكم في منصة OverlayX برمجياً أو عبر أجهزة التحكم الخارجية.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Terminal className="text-green-500" />
          التحكم عبر REST API
        </h2>
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
           <p className="text-gray-400 mb-4">يمكنك التحكم في القوالب عن طريق إرسال طلبات HTTP POST إلى الخادم المحلي (Localhost) عند تشغيل تطبيق سطح المكتب.</p>
           
           <div className="space-y-4">
             <div>
               <div className="flex items-center gap-2 mb-2">
                 <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded text-white">POST</span>
                 <code className="text-sm font-mono text-gray-300">/api/v1/overlays/{'{id}'}/visible</code>
               </div>
               <pre className="bg-black p-4 rounded text-xs text-green-400 font-mono overflow-x-auto" dir="ltr">
{`{
  "visible": true
}`}
               </pre>
             </div>

             <div>
               <div className="flex items-center gap-2 mb-2">
                 <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded text-white">POST</span>
                 <code className="text-sm font-mono text-gray-300">/api/v1/overlays/{'{id}'}/fields</code>
               </div>
               <pre className="bg-black p-4 rounded text-xs text-green-400 font-mono overflow-x-auto" dir="ltr">
{`{
  "fields": {
    "homeScore": 3,
    "awayScore": 1
  }
}`}
               </pre>
             </div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Grid className="text-purple-500" />
          تكامل Stream Deck / Bitfocus Companion
        </h2>
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-400 mb-4">
            لدمج Stream Deck، استخدم إضافة "HTTP Request" وقم بتوجيه الطلبات إلى العناوين أعلاه.
            فيما يلي مثال JSON لزر "زيادة النتيجة":
          </p>
          <pre className="bg-black p-4 rounded text-xs text-yellow-400 font-mono overflow-x-auto" dir="ltr">
{`// Stream Deck Action: Increase Home Score
// URL: http://localhost:3000/api/overlays/soccer-1/action
// Method: POST

{
  "action": "increment",
  "field": "homeScore",
  "value": 1
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Docs;
