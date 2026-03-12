import { AES_KEY_STR, AES_IV_STR } from '../config';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * 生成 IV (与 Java 代码逻辑一致)
 */
function generateIV(keyId: string): Uint8Array {
  const iv = new Uint8Array(16);
  const keyIdBytes = encoder.encode(keyId);
  
  for (let i = 0; i < Math.min(keyIdBytes.length, iv.length); i++) {
    // (keyIdBytes[i] + i * 15) % 255
    iv[i] = (keyIdBytes[i] + i * 15) % 255;
  }
  return iv;
}

/**
 * 解密单元格数据
 * 针对 SLIK 上报中的加密列执行反解密
 * 使用 AES-GCM 算法，IV 生成逻辑对齐 Java 版本
 */
export async function decryptCell(val: any, headerName?: string): Promise<any> {
  if(!val || typeof val !== 'string') return val;
  const s = val.trim();
  if (s === "" || s === "[NULL]") return "";

  if (!window.crypto || !window.crypto.subtle) {
    return val;
  }

  const ENCRYPT_START = "[ENCRYPTED]";
  const ENCRYPT_END = "[/ENCRYPTED]";

  let encryptedPart = "";
  let isMarked = false;

  // 1. 识别加密内容
  if (s.includes(ENCRYPT_START) && s.includes(ENCRYPT_END)) {
    const start = s.indexOf(ENCRYPT_START);
    const end = s.indexOf(ENCRYPT_END);
    encryptedPart = s.substring(start + ENCRYPT_START.length, end).trim();
    isMarked = true;
  } 
  // 识别原始 Base64 模式
  else if (s.length >= 20 && /^[A-Za-z0-9+/=]+$/.test(s) && !s.includes(" ")) {
    encryptedPart = s;
  }

  if (encryptedPart) {
    try {
      // 2. Base64 解码
      const cleanBase64 = encryptedPart.replace(/\s/g, '');
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 3. 导入密钥 (AES-GCM)
      const keyBytes = encoder.encode(AES_KEY_STR);
      const key = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      // 4. 准备 IV (使用 Java 版本的 generateIV 逻辑)
      const iv = generateIV(AES_IV_STR);

      // 5. 执行解密 (AES-GCM, 128位 tag)
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { 
          name: "AES-GCM", 
          iv: iv,
          tagLength: 128 // 128位认证标签
        },
        key,
        bytes
      );

      // 6. 转换为文本并去除可能的填充干扰 (包括 null 字节和不可见字符)
      const decryptedText = decoder.decode(decryptedBuffer)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符和 null 字节
        .trim();
      
      if (decryptedText) {
        return decryptedText;
      }
    } catch (e) {
      if (isMarked) console.error("解密失败:", e);
    }
  }
  return val;
}
