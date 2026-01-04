/**
 * PDF生成ユーティリティ
 * 領収書・支払調書のPDF生成機能を提供
 */

import jsPDF from 'jspdf';

interface ReceiptData {
    receiptNumber: string;      // 領収書番号（契約ID）
    issueDate: Date;            // 発行日
    clientName: string;         // 支払者名
    workerName: string;         // 発行者名（ワーカー名）
    jobTitle: string;           // 案件名
    amount: number;             // 税抜金額
    tax: number;                // 消費税
    totalAmount: number;        // 税込金額
    completedAt: Date;          // 検収完了日
}

interface PaymentStatementData {
    year: number;               // 対象年（暦年）
    workerName: string;         // 受取者名
    totalAmount: number;        // 年間支払総額
    contracts: {
        jobTitle: string;
        amount: number;
        completedAt: Date;
    }[];
}

// 日本語フォントの読み込み
async function loadFont(doc: jsPDF) {
    try {
        const fontUrl = '/fonts/NotoSansJP-Regular.ttf';
        const response = await fetch(fontUrl);
        if (!response.ok) {
            throw new Error(`Failed to load font: ${response.statusText}`);
        }
        const fontBuffer = await response.arrayBuffer();
        const fontBase64 = arrayBufferToBase64(fontBuffer);
        
        doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
        doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
        doc.setFont('NotoSansJP');
    } catch (error) {
        console.error('Font loading failed:', error);
        // フォールバック: デフォルトフォントを使用（文字化けする可能性あり）
        doc.setFont('helvetica');
    }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * 領収書PDFを生成（クライアント向け）
 */
export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    await loadFont(doc);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 30;

    // ヘッダー（背景色付き）
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // タイトル
    doc.setFontSize(24);
    doc.setTextColor(60, 60, 60);
    doc.text('領収書', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text('RECEIPT', pageWidth / 2, 32, { align: 'center' });
    
    y = 60;

    // 宛名
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`${data.clientName} 様`, margin, y);
    
    // 領収金額
    y += 20;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 10, pageWidth - margin * 2, 25, 'F');
    
    doc.setFontSize(12);
    doc.text('領収金額', margin + 5, y + 5);
    
    doc.setFontSize(22);
    doc.text(`¥ ${data.totalAmount.toLocaleString()}-`, pageWidth / 2, y + 5, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('(税込)', pageWidth - margin - 5, y + 5, { align: 'right' });

    y += 30;

    // 但し書き
    doc.setFontSize(11);
    doc.text('但', margin, y);
    const splitTitle = doc.splitTextToSize(`案件「${data.jobTitle}」の代金として`, pageWidth - margin * 2 - 20);
    doc.text(splitTitle, margin + 10, y);
    doc.text('上記正に領収いたしました', margin, y + 10);

    y += 25;

    // 明細テーブル
    const tableTop = y;
    const col1 = margin;
    const col2 = pageWidth - margin - 60;
    const col3 = pageWidth - margin;

    // ヘッダー
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('項目', col1 + 2, y);
    doc.text('金額', col3 - 2, y, { align: 'right' });
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);

    // 内容
    y += 10;
    doc.setTextColor(0, 0, 0);
    doc.text('税抜金額', col1 + 2, y);
    doc.text(`¥ ${data.amount.toLocaleString()}`, col3 - 2, y, { align: 'right' });
    
    y += 8;
    doc.text('消費税 (10%)', col1 + 2, y);
    doc.text(`¥ ${data.tax.toLocaleString()}`, col3 - 2, y, { align: 'right' });

    y += 5;
    doc.line(margin, y, pageWidth - margin, y);

    // 合計
    y += 10;
    doc.setFontSize(12);
    doc.text('合計', col1 + 2, y);
    doc.text(`¥ ${data.totalAmount.toLocaleString()}`, col3 - 2, y, { align: 'right' });

    y += 20;

    // 発行情報
    const infoX = pageWidth - margin - 80;
    doc.setFontSize(10);
    doc.text(`発行日: ${formatDate(data.issueDate)}`, infoX, y);
    y += 6;
    
    // 領収書番号生成 (YYYYMMDD + 契約IDから生成した3桁の番号)
    const dateStr = formatDateForFileName(data.completedAt);
    const serialNum = generateSerialNumber(data.receiptNumber);
    doc.text(`領収書番号: ${dateStr}${serialNum}`, infoX, y);
    
    y += 6;
    doc.text(`検収完了日: ${formatDate(data.completedAt)}`, infoX, y);

    y += 15;

    // 発行者情報（枠付き）
    const issuerBoxY = y;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(infoX, issuerBoxY, 80, 45);

    y += 8;
    doc.setFontSize(10);
    doc.text('発行者:', infoX + 5, y);
    
    y += 8;
    doc.setFontSize(12);
    // ワーカー名を表示
    doc.text(data.workerName || '（名称未設定）', infoX + 10, y);
    
    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('収納代行:', infoX + 5, y);
    y += 5;
    doc.text('Project Market Hub', infoX + 10, y);

    // フッター注釈
    y = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text('※本領収書は、Project Market Hubが収納代行業者として発行しています。', pageWidth / 2, y, { align: 'center' });
    doc.text('※電子的に発行されたものであり、印紙税の課税対象外です。', pageWidth / 2, y + 5, { align: 'center' });

    // ダウンロード
    const fileName = `receipt_${data.receiptNumber}_${formatDateForFileName(data.issueDate)}.pdf`;
    doc.save(fileName);
}

/**
 * 年間支払調書PDFを生成（ワーカー向け）
 */
export async function generatePaymentStatementPDF(data: PaymentStatementData): Promise<void> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    await loadFont(doc);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 30;

    // ヘッダー
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // タイトル
    doc.setFontSize(20);
    doc.setTextColor(60, 60, 60);
    doc.text('支払調書', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text('PAYMENT STATEMENT', pageWidth / 2, 32, { align: 'center' });
    
    y = 60;

    // 対象期間・発行日
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`対象年: ${data.year}年分`, margin, y);
    doc.text(`対象期間: ${data.year}/01/01 - ${data.year}/12/31`, margin, y + 6);
    
    doc.text(`発行日: ${formatDate(new Date())}`, pageWidth - margin, y, { align: 'right' });
    
    y += 20;

    // 受取者情報
    doc.setFontSize(12);
    doc.text('受取者:', margin, y);
    doc.setFontSize(16);
    doc.text(`${data.workerName} 様`, margin + 20, y);
    
    y += 20;

    // 年間支払総額
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 10, pageWidth - margin * 2, 25, 'F');
    
    doc.setFontSize(12);
    doc.text('年間支払総額', margin + 5, y + 5);
    doc.setFontSize(20);
    doc.text(`¥ ${data.totalAmount.toLocaleString()}-`, pageWidth / 2, y + 5, { align: 'center' });
    
    y += 30;

    // 明細テーブルヘッダー描画関数
    const drawTableHeader = (currentY: number) => {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const col1 = margin;
        const col2 = margin + 100;
        const col3 = pageWidth - margin;
        
        doc.text('案件名', col1, currentY);
        doc.text('完了日', col2, currentY);
        doc.text('金額', col3, currentY, { align: 'right' });
        
        const lineY = currentY + 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, lineY, pageWidth - margin, lineY);
        
        return lineY + 8; // 次の行の開始Y座標
    };

    const col1 = margin;
    const col2 = margin + 100;
    const col3 = pageWidth - margin;

    y = drawTableHeader(y);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    const rowHeight = 8; // 行の高さ

    // 明細行
    for (const contract of data.contracts) {
        if (y > 250) {
            doc.addPage();
            y = 30;
            y = drawTableHeader(y);
            doc.setTextColor(0, 0, 0); // ヘッダー描画で色が変わるので戻す
        }

        // 案件名（長い場合は切り詰め）
        let title = contract.jobTitle;
        if (title.length > 35) {
            title = title.substring(0, 32) + '...';
        }
        
        // 下罫線寄りに配置（下から2mmの位置）
        const textY = y + rowHeight - 2;

        doc.text(title, col1, textY);
        doc.text(formatDate(contract.completedAt), col2, textY);
        doc.text(`¥ ${contract.amount.toLocaleString()}`, col3, textY, { align: 'right' });
        
        y += rowHeight;
        
        // 薄い区切り線
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, y, pageWidth - margin, y);
        
        y += 2; // 行間
    }

    // 合計行
    y += 5;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    doc.setFontSize(12);
    doc.text('合計', col1, y);
    doc.text(`¥ ${data.totalAmount.toLocaleString()}`, col3, y, { align: 'right' });
    
    y += 30;

    // 発行者情報
    const infoX = pageWidth - margin - 80;
    doc.setFontSize(10);
    doc.text('発行者:', infoX, y);
    y += 6;
    doc.setFontSize(11);
    doc.text('Project Market Hub', infoX + 5, y);
    y += 6;
    doc.setFontSize(9);
    doc.text('運営: 山本健太', infoX + 5, y);
    y += 5;
    doc.text('〒600-8208', infoX + 5, y);
    y += 5;
    doc.text('京都市下京区小稲荷町85-2', infoX + 5, y);
    y += 5;
    doc.text('Grand-K 京都駅前ビル 201', infoX + 5, y);
    y += 5;
    doc.text('Email: service@pj-markethub.com', infoX + 5, y);

    // フッター
    y = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text('この書類は確定申告等の参考資料としてご利用ください。', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text('具体的な税務処理については、税理士または税務署にご相談ください。', pageWidth / 2, y + 5, { align: 'center' });

    // ダウンロード
    const fileName = `payment_statement_${data.year}.pdf`;
    doc.save(fileName);
}

// ヘルパー関数
function formatDate(date: Date): string {
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatDateForFileName(date: Date): string {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

// IDから一意の3桁の番号を生成する
function generateSerialNumber(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    const num = Math.abs(hash) % 1000;
    return num.toString().padStart(3, '0');
}
