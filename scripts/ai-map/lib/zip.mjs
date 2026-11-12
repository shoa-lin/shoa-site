// Minimal ZIP reader (stored + deflate entries) so collectors can read Epoch AI bundles without unzip or npm deps.
import { inflateRawSync } from "node:zlib";

export function readZip(buffer) {
  const files = new Map();
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP: end of central directory not found");
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("ZIP: bad central directory entry");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(start, start + compressedSize);
    if (!name.endsWith("/")) {
      if (method === 0) files.set(name, Buffer.from(data));
      else if (method === 8) files.set(name, inflateRawSync(data));
      else throw new Error(`ZIP: unsupported compression method ${method} for ${name}`);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

export function zipEntry(files, basename) {
  for (const [name, data] of files) if (name === basename || name.endsWith(`/${basename}`)) return data.toString("utf8");
  throw new Error(`ZIP: ${basename} not found (have ${[...files.keys()].join(", ")})`);
}
