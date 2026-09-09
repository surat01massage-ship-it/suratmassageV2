import React, { useState } from 'react';
import { Database, ExternalLink, RefreshCw, UploadCloud, CheckCircle, Download, Copy, AlertCircle, Link as LinkIcon, Table } from 'lucide-react';

interface Props {
  rawDb: any;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function GoogleSheetsExport({ rawDb, onShowToast }: Props) {
  const [webhookUrl, setWebhookUrl] = useState<string>(rawDb?.settings?.googleSheetWebhookUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  const handleSyncToGoogleSheets = async () => {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      onShowToast('กรุณาระบุ URL ของ Google Apps Script Web App ให้ถูกต้องค่ะ (เช่น https://script.google.com/macros/s/.../exec)', 'error');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      const res = await fetch('/api/sync/googlesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ซิงค์ข้อมูลไม่สำเร็จ');
      }

      setSyncStatus('success');
      setSyncMessage(data.message || 'ซิงค์ข้อมูลทั้งหมด 8 ตารางเข้า Google Sheets สำเร็จเรียบร้อยแล้ว!');
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      onShowToast('✅ บันทึกและซิงค์ข้อมูลทั้งหมดเข้า Google Sheets สำเร็จเรียบร้อย!', 'success');
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      onShowToast('❌ ไม่สามารถซิงค์ข้อมูลได้: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadCsv = (tableName: string) => {
    if (!rawDb || !rawDb[tableName] || rawDb[tableName].length === 0) {
      onShowToast(`ตาราง ${tableName} ไม่มีข้อมูลสำหรับดาวน์โหลด`, 'info');
      return;
    }

    const rows = rawDb[tableName];
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) =>
        headers.map(h => {
          let val = row[h];
          if (val === undefined || val === null) return '""';
          if (typeof val === 'object') val = JSON.stringify(val);
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sabaidee_${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast(`ดาวน์โหลดไฟล์ ${tableName}.csv สำเร็จ นำไปเปิดใน Google Sheets ได้ทันที`, 'success');
  };

  const handleDownloadAllJson = () => {
    if (!rawDb) return;
    const blob = new Blob([JSON.stringify(rawDb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sabaidee_full_database_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('ดาวน์โหลดไฟล์สำรองข้อมูลฐานข้อมูลทั้งหมดเรียบร้อย', 'success');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-sky-500" />
            ระบบซิงค์และบันทึกข้อมูลเข้า Google Sheets (Google Sheets Auto-Sync)
          </h4>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            บันทึกข้อมูลลูกค้า, พนักงานนวด, รายการบริการ, การจอง, สลิปเติมเครดิต, รีวิว และการตั้งค่าลง Google Sheets อัตโนมัติ
          </p>
        </div>

        <button
          onClick={handleDownloadAllJson}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
        >
          <Download className="w-4 h-4" /> สำรองข้อมูล JSON ทั้งหมด
        </button>
      </div>

      {/* Webhook Sync Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-slate-700 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-sky-600" />
            URL ของ Google Apps Script Web App (สำหรับบันทึกข้อมูลอัตโนมัติ)
          </label>
          {lastSyncTime && (
            <span className="text-[10px] text-emerald-600 font-mono font-bold">
              ซิงค์ล่าสุด: {lastSyncTime}
            </span>
          )}
        </div>

        {webhookUrl.includes('docs.google.com/spreadsheets') && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              ข้อสังเกต: ลิงก์ที่กรอกคือลิงก์เปิดดู Google Sheets (docs.google.com)
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              Google Sheets ไม่สามารถรับข้อมูลอัตโนมัติจากภายนอกได้โดยตรง จำเป็นต้องใช้ <strong>Google Apps Script Web App</strong> (URL จะขึ้นต้นด้วย <span className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">https://script.google.com/macros/s/.../exec</span>) กรุณาดูวิธีสร้างที่กล่องแนะนำด้านล่างค่ะ
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
            className={`flex-1 text-xs font-mono bg-white border rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none shadow-xs ${
              webhookUrl.includes('docs.google.com/spreadsheets')
                ? 'border-amber-400 focus:border-amber-500'
                : 'border-slate-200 focus:border-sky-500'
            }`}
          />
          <button
            onClick={handleSyncToGoogleSheets}
            disabled={isSyncing}
            className="bg-sky-500 hover:bg-sky-600 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {isSyncing ? 'กำลังส่งข้อมูลเข้า Sheet...' : '⚡ บันทึกข้อมูลทั้งหมดเข้า Google Sheets ทันที'}
          </button>
        </div>

        {syncStatus === 'success' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {syncStatus === 'error' && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="whitespace-pre-line leading-relaxed">{syncMessage}</div>
          </div>
        )}
      </div>

      {/* Download CSV per table */}
      <div className="space-y-3">
        <h5 className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <Table className="w-4 h-4 text-emerald-600" />
          หรือดาวน์โหลดไฟล์ตาราง (.CSV) เพื่อนำไปเปิดหรืออิมพอร์ตใน Google Sheets โดยตรง:
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {rawDb && Object.keys(rawDb).map((tableKey) => (
            <button
              key={tableKey}
              onClick={() => handleDownloadCsv(tableKey)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer group"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-800 capitalize block group-hover:text-sky-600">
                  {tableKey}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {Array.isArray(rawDb[tableKey]) ? `${rawDb[tableKey].length} รายการ` : 'การตั้งค่า'}
                </span>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
            </button>
          ))}
        </div>
      </div>

      {/* 3-Step Setup Guide */}
      <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 space-y-2 text-xs text-slate-700">
        <h5 className="font-extrabold text-sky-900 flex items-center gap-1.5">
          📖 วิธีติดตั้ง Google Apps Script เพื่อบันทึกข้อมูลเข้า Google Sheets แบบอัตโนมัติ (3 ขั้นตอน):
        </h5>
        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
          <li>เปิด <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-sky-600 underline font-semibold">Google Sheets เปล่า (sheets.new)</a> ขึ้นมา 1 แผ่นงาน</li>
          <li>ไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong> แล้วนำโค้ดจากแท็บ <strong>Google Apps Script Package</strong> ในหน้านี้ไปวาง</li>
          <li>กดปุ่ม <strong>ทำให้ใช้งานได้ (Deploy) &gt; การปรับใช้ใหม่ (New deployment) &gt; เว็บแอป (Web App)</strong> เลือกสิทธิ์เป็น <em>ทุกคน (Anyone)</em> แล้วนำ URL ที่ได้มาวางในช่องด้านบนนี้ จากนั้นกดปุ่มซิงค์ได้เลย!</li>
        </ol>
      </div>
    </div>
  );
}
