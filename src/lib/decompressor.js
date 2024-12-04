import LZString from 'lz-string';
export function decompress (data) {
    let cleanedData = '';
    const length = data.length;

    for (let i = 0; i < length; i++) {
        const char = data[i];
        if (char !== '\n' && char !== '\r') {
            cleanedData += char;
        }
    }

    return LZString.decompressFromBase64(cleanedData);
};