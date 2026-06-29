/**
 * app.js
 * Módulo TP4Products para gerenciamento de CRUD em arquivo binário simulado via LocalStorage.
 */

const STORAGE_KEY = 'tp4_products_file_bytes';

const TP4Products = (() => {
  // Inicializa arquivo se não existir
  function initFile() {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      // Cria cabeçalho com lastId = 0 (4 bytes int)
      const header = ByteStream.writeInt(0);
      saveBytes(header);
      // Carrega dados de exemplo iniciais para demonstrar
      loadSampleData();
    }
  }

  function getBytes() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return new Int8Array(0);
    try {
      const arr = JSON.parse(data);
      return new Int8Array(arr);
    } catch (e) {
      console.error("Erro ao ler localStorage", e);
      return new Int8Array(0);
    }
  }

  function saveBytes(int8Array) {
    const arr = Array.from(int8Array);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  /**
   * Lê o lastId do cabeçalho
   */
  function getLastId(bytes) {
    if (bytes.length < 4) return 0;
    return ByteStream.readInt(bytes, 0);
  }

  /**
   * Atualiza o lastId no cabeçalho
   */
  function setLastId(bytes, newId) {
    const idBytes = ByteStream.writeInt(newId);
    const newFile = new Int8Array(bytes.length);
    newFile.set(bytes);
    newFile.set(idBytes, 0);
    return newFile;
  }

  /**
   * Faz a varredura do arquivo e retorna a lista de todos os registros (ativos e excluídos)
   * com seus metadados e offsets físicos.
   */
  function scanFile() {
    const bytes = getBytes();
    const records = [];
    if (bytes.length < 4) return { lastId: 0, records, bytes };

    const lastId = getLastId(bytes);
    let offset = 4;
    let recordIndex = 1;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    while (offset < bytes.length) {
      if (offset + 5 > bytes.length) break; // Arquivo corrompido ou incompleto

      const lapideOffset = offset;
      const lapide = ByteStream.readByte(bytes, offset);
      
      const sizeOffset = offset + 1;
      const recordSize = ByteStream.readInt(bytes, sizeOffset);
      
      const payloadOffset = offset + 5;
      if (payloadOffset + recordSize > bytes.length) break;

      const idOffset = payloadOffset;
      const id = ByteStream.readInt(bytes, idOffset);

      const nameOffset = idOffset + 4;
      const strLen = view.getUint16(nameOffset, false);
      const name = ByteStream.readString(bytes, nameOffset);
      const nameTotalBytes = 2 + strLen;

      const priceOffset = nameOffset + nameTotalBytes;
      const price = ByteStream.readFloat(bytes, priceOffset);

      const dateOffset = priceOffset + 4;
      const createdAtDate = ByteStream.readDateTime(bytes, dateOffset);

      records.push({
        index: recordIndex++,
        lapide: lapide, // 0 = ativo, 1 = excluído
        recordSize: recordSize,
        id: id,
        name: name,
        price: price,
        createdAt: createdAtDate.getTime(),
        createdAtStr: createdAtDate.toLocaleString('pt-BR'),
        offsets: {
          start: lapideOffset,
          lapide: lapideOffset,
          size: sizeOffset,
          id: idOffset,
          name: nameOffset,
          price: priceOffset,
          date: dateOffset,
          end: payloadOffset + recordSize
        }
      });

      offset = payloadOffset + recordSize;
    }

    return { lastId, records, bytes };
  }

  /**
   * Concatena dois Int8Arrays
   */
  function concatBytes(a, b) {
    const res = new Int8Array(a.length + b.length);
    res.set(a, 0);
    res.set(b, a.length);
    return res;
  }

  /**
   * Inclusão de novo produto
   */
  function createProduct(name, price) {
    let { lastId, bytes } = scanFile();
    const newId = lastId + 1;
    const createdAt = Date.now();

    // Serializa campos do payload
    const idBytes = ByteStream.writeInt(newId);
    const nameBytes = ByteStream.writeString(name);
    const priceBytes = ByteStream.writeFloat(parseFloat(price));
    const dateBytes = ByteStream.writeDateTime(new Date(createdAt));

    // Calcula tamanho do payload
    const recordSize = idBytes.length + nameBytes.length + priceBytes.length + dateBytes.length;
    const sizeBytes = ByteStream.writeInt(recordSize);
    const lapideBytes = ByteStream.writeByte(0); // 0 = Ativo

    // Atualiza cabeçalho com lastId
    bytes = setLastId(bytes, newId);

    // Monta novo registro e anexa ao fim do arquivo
    let newRecord = concatBytes(lapideBytes, sizeBytes);
    newRecord = concatBytes(newRecord, idBytes);
    newRecord = concatBytes(newRecord, nameBytes);
    newRecord = concatBytes(newRecord, priceBytes);
    newRecord = concatBytes(newRecord, dateBytes);

    const updatedFile = concatBytes(bytes, newRecord);
    saveBytes(updatedFile);
    return newId;
  }

  /**
   * Alteração de produto existente
   * Marca o antigo com lápide 1 e anexa o novo registro com o mesmo ID
   */
  function updateProduct(id, newName, newPrice) {
    let { records, bytes } = scanFile();
    const target = records.find(r => r.id === id && r.lapide === 0);
    if (!target) throw new Error("Produto ativo não encontrado com ID " + id);

    // Marca lápide antiga como excluída (1)
    bytes[target.offsets.lapide] = 1;

    // Cria novo registro preservando o ID e data original (ou nova data de alteração)
    const idBytes = ByteStream.writeInt(id);
    const nameBytes = ByteStream.writeString(newName);
    const priceBytes = ByteStream.writeFloat(parseFloat(newPrice));
    const dateBytes = ByteStream.writeDateTime(new Date(target.createdAt));

    const recordSize = idBytes.length + nameBytes.length + priceBytes.length + dateBytes.length;
    const sizeBytes = ByteStream.writeInt(recordSize);
    const lapideBytes = ByteStream.writeByte(0); // 0 = Ativo

    let newRecord = concatBytes(lapideBytes, sizeBytes);
    newRecord = concatBytes(newRecord, idBytes);
    newRecord = concatBytes(newRecord, nameBytes);
    newRecord = concatBytes(newRecord, priceBytes);
    newRecord = concatBytes(newRecord, dateBytes);

    const updatedFile = concatBytes(bytes, newRecord);
    saveBytes(updatedFile);
  }

  /**
   * Exclusão lógica de produto (muda lápide para 1)
   */
  function deleteProduct(id) {
    let { records, bytes } = scanFile();
    const target = records.find(r => r.id === id && r.lapide === 0);
    if (!target) throw new Error("Produto ativo não encontrado com ID " + id);

    bytes[target.offsets.lapide] = 1;
    saveBytes(bytes);
  }

  /**
   * Limpa todo o arquivo no LocalStorage
   */
  function cleanBase() {
    const header = ByteStream.writeInt(0);
    saveBytes(header);
  }

  /**
   * Carrega dados de exemplo (Caderno, Teclado Mecânico, Mouse Sem Fio)
   */
  function loadSampleData() {
    cleanBase();
    createProduct("Caderno", 24.90);
    createProduct("Teclado Mecânico", 199.90);
    createProduct("Mouse Sem Fio", 59.50);
  }

  return {
    initFile,
    scanFile,
    createProduct,
    updateProduct,
    deleteProduct,
    cleanBase,
    loadSampleData
  };
})();

// Exporta para uso na UI
if (typeof window !== 'undefined') {
  window.TP4Products = TP4Products;
}
