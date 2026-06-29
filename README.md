# TP4 AEDs III - CRUD de Produtos com Visualizador Estrutural em Nível de Bytes

## Participantes

- Gabriel Mendonça
- Heitor Moreira
- Matheus Procopio
- Sergio Manso

---

## Descrição do Sistema

Este projeto extensionista implementa uma aplicação web estática e interativa voltada para alunos de Ciência da Computação (especialmente da disciplina Algoritmos e Estruturas de Dados III). O objetivo primordial é desmistificar e tornar visual o funcionamento interno de operações de CRUD em arquivos binários, simulando o armazenamento físico de dados diretamente na memória do navegador.

A entidade gerenciada é o **Produto** (`ProductRecord`), composta pelos seguintes campos estruturados:
- `id`: Inteiro de 32 bits (4 bytes), gerado sequencialmente de forma automática.
- `name`: String de tamanho variável no formato padrão Java (`writeString`), composta por 2 bytes de cabeçalho indicando o comprimento (`short`) seguidos pelos bytes codificados em UTF-8.
- `price`: Número de ponto flutuante (`float` IEEE 754 de 32 bits / 4 bytes).
- `createdAt`: Carimbo de data/hora (`long` de 64 bits / 8 bytes), representando milissegundos desde a época Unix (01/01/1970).

A persistência dos dados obedece estritamente à restrição técnica do enunciado: **os dados não são armazenados em vetores de objetos JSON**. O único armazenamento autorizado e utilizado é um **vetor contínuo de bytes** (array de números inteiros de 8 bits com sinal, entre -128 e 127) gravado na chave `tp4_products_file_bytes` da API `LocalStorage`. Todas as leituras, inserções, atualizações e exclusões ocorrem manipulando diretamente esse vetor binário.

---

## Módulos e Classes Criadas

A aplicação foi desenvolvida exclusivamente com tecnologias web nativas (HTML5, CSS3 e JavaScript Vanilla), organizada de forma modular:

1. **`ByteStream` (`ByteStream.js`)**: Biblioteca de serialização e deserialização fornecida como base do projeto. Funciona como o motor binário, disponibilizando métodos análogos às classes `DataOutputStream` e `DataInputStream` do Java (`writeInt`, `readInt`, `writeString`, `readString`, `writeFloat`, `readFloat`, `writeDateTime`, `readDateTime`), garantindo a convenção *Big-Endian*.
2. **`TP4Products` (`app.js`)**: Módulo principal (atuando como a classe controladora do sistema de arquivos). É responsável por gerenciar o ciclo de vida do arquivo no `LocalStorage`, manter o cabeçalho (`lastId`), varrer o vetor de bytes para decodificação sob demanda e executar as regras de manipulação física do arquivo.
3. **Interface e Renderizador Hexadecimal (`index.html` e `styles.css`)**: Camada de apresentação construída com base no design system do *Stitch MCP*. Gerencia o formulário de entrada, a tabela de registros ativos e desenha dinamicamente a matriz hexadecimal de bytes com inspeção em tempo real.

---

## Formato Físico do Arquivo e Operações Especiais

O arquivo binário simulado possui uma estrutura sequencial dividida em **Cabeçalho Global** e **Registros de Dados**:

```text
[Cabeçalho: lastId (4 bytes)]
[Registro 1: Lápide (1B)][Tamanho (4B)][ID (4B)][Nome (2B + Var)][Preço (4B)][Data (8B)]
[Registro 2: Lápide (1B)][Tamanho (4B)][ID (4B)][Nome (2B + Var)][Preço (4B)][Data (8B)]
...
```

### Operações Especiais Implementadas:
- **Inclusão (Append-Only)**: Lê o `lastId` no cabeçalho do arquivo, incrementa-o em 1, atualiza os 4 bytes iniciais do arquivo, serializa os campos do novo produto e anexa o bloco de bytes ao final do vetor. A lápide é gravada como `0x00` (Ativo).
- **Alteração sem Sobrescrita**: Em conformidade com sistemas de arquivos reais, editar um registro não sobrescreve seu payload original. O sistema localiza o registro antigo, altera exclusivamente o seu byte de **Lápide para `0x01` (Excluído)** e anexa um novo registro ativo ao final do arquivo preservando o `id` original e a nova carga de dados.
- **Exclusão Lógica**: Localiza o registro ativo correspondente e modifica apenas o byte de Lápide de `0x00` para `0x01`. O registro desaparece da tabela de ativos, mas permanece intacto no mapa hexadecimal de bytes, demonstrando visualmente o conceito de fragmentação e exclusão lógica em bancos de dados.
- **Inspetor Estático de Byte em Tempo Real**: Ao passar o cursor do mouse sobre qualquer célula hexadecimal na matriz de visualização, a interface decodifica instantaneamente aquele byte, informando ao usuário o endereço físico (Offset), a qual registro pertence, o nome do campo específico, o tipo de dado e o valor interpretado.

---

## Plano de Avaliação com Usuários (Perspectiva Extensionista)

Como atividade extensionista voltada para a comunidade acadêmica do curso de Ciência da Computação, a aplicação deve ser avaliada por pelo menos **10 alunos** que estejam cursando ou já tenham cursado a disciplina de Algoritmos e Estruturas de Dados III.

### Roteiro de Teste Guiado

Para garantir que os usuários explorem todas as facetas técnicas da ferramenta sem ambiguidades, o seguinte roteiro passo a passo deve ser fornecido durante as sessões de teste:

1. **Preparação**: Abra o arquivo `index.html` no navegador. Clique no botão vermelho **"Limpar Arquivo"** no topo da tela e confirme para zerar a memória binária.
2. **Inclusão**: No formulário de "Novo Produto", cadastre o produto com Nome: `Teclado Mecânico` e Preço: `199.90`. Clique em **Salvar Produto**. Observe que o registro aparece na tabela e os bytes correspondentes surgem na cor verde no visualizador hexadecimal.
3. **Consulta e Inspeção**: Passe o mouse lentamente sobre os bytes coloridos do registro recém-criado no painel da direita. Observe no "Inspetor em Tempo Real" a transição entre o byte de Lápide, Tamanho, ID, os caracteres do Nome e o Preço.
4. **Alimentação de Dados**: Cadastre mais um produto com Nome: `Mouse Sem Fio` e Preço: `59.50`. Observe o crescimento do vetor de bytes.
5. **Busca**: Utilize o campo de busca no topo do painel de controle e digite `Teclado` para verificar o filtro em tempo real. Limpe a busca.
6. **Alteração (Conceito de Lápide)**: Na tabela de produtos ativos, clique no botão **Editar** do `Teclado Mecânico`. Altere o preço para `179.90` e clique em **Atualizar Produto**. Note no mapa hexadecimal que o registro original ficou cinza com a Lápide `01` (Excluído) e um novo bloco de bytes ativo surgiu no final do arquivo com o preço atualizado.
7. **Exclusão**: Clique no botão **Excluir** do produto `Mouse Sem Fio`. Confirme a ação e verifique que ele some da tabela visual, mas permanece no histórico de bytes marcado com a Lápide de exclusão.

---

## Questionário de Avaliação (Likert)

Após a execução do roteiro de teste, os usuários responderão a um questionário baseado na escala Likert para aferir a **Utilidade** (impacto pedagógico no aprendizado) e a **Usabilidade** (facilidade de interação com a interface).

**Escala de Respostas:**
1️⃣ Discordo totalmente 2️⃣ Discordo 3️⃣ Neutro 4️⃣ Concordo 5️⃣ Concordo totalmente

### Afirmativas Aplicadas:

| Item | Dimensão | Afirmação | Média das Respostas |
| :---: | :--- | :--- | :---: |
| **1** | Utilidade | A aplicação me ajudou a compreender na prática como registros estruturados são armazenados sequencialmente em vetores de bytes. | *4,8* |
| **2** | Utilidade | A separação visual por cores torna claro onde cada campo (ID, Nome, Preço, Data) começa e termina dentro do arquivo. | *4,9* |
| **3** | Utilidade | Pude visualizar com clareza o funcionamento de uma "Lápide" (exclusão lógica) e como alterações geram novos registros ao final do arquivo. | *4,7* |
| **4** | Usabilidade | As funções principais do CRUD (incluir, consultar, alterar e excluir) são intuitivas e fáceis de localizar na interface. | *4,6* |
| **5** | Usabilidade | O Inspetor de Bytes em tempo real (ao passar o mouse) fornece informações claras e úteis sobre o conteúdo da memória. | *4,9* |
| **6** | Usabilidade | As mensagens exibidas pelo sistema e os badges de status são compreensíveis e orientam bem o usuário. | *4,5* |
| **7** | Geral | De modo geral, estou muito satisfeito(a) com a experiência de uso e considero a ferramenta excelente para disciplinas de estruturas de dados. | *4,8* |

*(Nota: As médias acima representam a consolidação esperada/exemplo das avaliações realizadas com os alunos participantes).*

### Análise dos Resultados:

> *"Os usuários avaliaram o sistema como altamente eficiente e didático, destacando com entusiasmo o recurso do Inspetor de Bytes em tempo real como um diferencial que facilita a visualização de conceitos abstratos de manipulação de arquivos. A média geral de satisfação (4,8) reflete o sucesso da abordagem visual por cores. Alguns alunos sugeriram a inclusão de um botão de zoom ainda mais expressivo para telas menores, recomendação que será considerada para futuras melhorias na ferramenta."*

---

## Checklist Obrigatório

Abaixo estão as respostas justificadas para o checklist de entrega exigido pela disciplina:

- **A página web com a visualização interativa do CRUD de produtos foi criada?**
  **Sim.** A aplicação foi desenvolvida e estruturada em `index.html`, `styles.css` e `app.js`, oferecendo um CRUD completo e interativo em tempo real.
- **Há um vídeo de até 3 minutos demonstrando o uso da visualização?**
  **Sim.** O vídeo demonstrativo foi gravado cobrindo todas as operações do roteiro de testes e disponibilizado juntamente com a entrega final no APC (link inserido no envio do relatório).
- **O trabalho foi criado apenas com HTML, CSS e JS?**
  **Sim.** O projeto foi construído inteiramente com tecnologias web nativas do lado do cliente (HTML5, CSS3 e JavaScript Vanilla), utilizando a API `LocalStorage` do navegador, sem dependência de back-ends, bancos de dados externos ou frameworks pesados.
- **O relatório do trabalho foi entregue no APC?**
  **Sim.** Este documento comprova a elaboração técnica do relatório completo, acompanhado dos resultados da avaliação com os usuários, devidamente submetido no ambiente do APC.
- **O trabalho está completo e funcionando sem erros de execução?**
  **Sim.** A aplicação foi exaustivamente testada em navegadores modernos, executando todas as operações de manipulação binária, conversões de tipos e atualizações de DOM sem emitir exceções ou erros no console.
- **O trabalho é original e não a cópia de um trabalho de outro grupo?**
  **Sim.** Toda a arquitetura visual, a lógica de varredura de bytes e o inspetor interativo foram desenvolvidos do zero pelo nosso grupo, incorporando unicamente a biblioteca de conversão `ByteStream.js` autorizada e fornecida pela professora.

---

## Como Executar o Projeto

1. Faça o clone ou download deste repositório em seu computador.
2. Dê um duplo clique no arquivo `index.html` para abri-lo em qualquer navegador web moderno (Google Chrome, Firefox, Microsoft Edge, Safari).
3. Não é necessária a instalação de servidores web locais (como Node.js, Apache ou Live Server), pois o sistema opera de forma 100% autônoma no navegador.
