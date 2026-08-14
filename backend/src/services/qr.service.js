/**
 * QR Code Service — generate QR image buffers
 */
const QRCode = require('qrcode');

const generateQRBuffer = async (data, options = {}) => {
  const qrData = typeof data === 'string' ? data : JSON.stringify(data);
  return QRCode.toBuffer(qrData, {
    type: 'png',
    width: options.width || 300,
    margin: options.margin || 2,
    color: {
      dark: options.dark || '#1e293b',
      light: options.light || '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
};

const generateQRDataURL = async (data, options = {}) => {
  const qrData = typeof data === 'string' ? data : JSON.stringify(data);
  return QRCode.toDataURL(qrData, {
    width: options.width || 300,
    margin: options.margin || 2,
    color: {
      dark: options.dark || '#1e293b',
      light: options.light || '#ffffff',
    },
  });
};

module.exports = { generateQRBuffer, generateQRDataURL };
