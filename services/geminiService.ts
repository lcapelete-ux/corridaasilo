const getClient = async () => {
  // Accessing process.env.API_KEY is handled by the build/runtime environment as per instructions
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("API Key não encontrada. As funcionalidades de IA serão desativadas.");
    // Retorna um objeto dummy ou lança erro controlado para não quebrar a app
    return null;
  }

  // Import dinâmico: o SDK só é baixado quando alguma função de IA é usada
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey: apiKey });
};

// Há chave de IA configurada neste build? A tela de inscrição em lote usa isso
// para dizer se vai interpretar com IA ou só com o leitor de colunas.
export const isAiEnabled = (): boolean => !!process.env.API_KEY;

// --- Inscrição em lote ------------------------------------------------------

export interface AiParsedRunner {
  fullName?: string; cpf?: string; birthDate?: string; gender?: string;
  shirtSize?: string; modality?: string; teamName?: string; city?: string;
  email?: string; phone?: string; guardianName?: string;
}

// Lê uma lista bagunçada (WhatsApp, e-mail, planilha desalinhada) e devolve as
// pessoas em campos separados. Só extrai o que está escrito: não inventa CPF
// nem data — o que faltar volta vazio e a tela cobra do admin na revisão.
export const parseRunnersFromText = async (texto: string): Promise<AiParsedRunner[] | null> => {
  try {
    const ai = await getClient();
    if (!ai) return null; // sem chave: quem assume é o leitor determinístico

    const prompt = `Você recebe uma lista de pessoas para inscrever numa corrida de rua no Brasil.
Extraia CADA pessoa como um objeto. Use exatamente estes campos:

- fullName: nome completo
- cpf: só os 11 dígitos, sem pontos ou traço
- birthDate: data de nascimento no formato AAAA-MM-DD (a lista costuma usar DD/MM/AAAA)
- gender: "Masculino" ou "Feminino"
- shirtSize: um de "P", "M", "G", "GG", "EXG"
- modality: "5k" para corrida de 5 km, "3k" para caminhada de 3 km
- teamName: equipe/academia/assessoria
- city: cidade
- email, phone, guardianName (responsável, quando a pessoa for menor de idade)

REGRAS IMPORTANTES:
1. NÃO invente dados. Campo que não estiver no texto deve voltar como string vazia.
2. Não corrija nem complete CPF, data ou nome — copie o que está escrito.
3. Ignore linhas que não são pessoas (títulos, saudações, totais, "segue a lista").
4. Uma pessoa por objeto, na ordem em que aparecem.

LISTA:
${texto}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fullName: { type: 'string' }, cpf: { type: 'string' },
              birthDate: { type: 'string' }, gender: { type: 'string' },
              shirtSize: { type: 'string' }, modality: { type: 'string' },
              teamName: { type: 'string' }, city: { type: 'string' },
              email: { type: 'string' }, phone: { type: 'string' },
              guardianName: { type: 'string' },
            },
          },
        },
      },
    } as any);

    const bruto = (response.text || '').trim();
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return null;
    return dados as AiParsedRunner[];
  } catch (error) {
    // Falha da IA nunca bloqueia: a tela segue com o leitor determinístico
    console.error('Falha ao interpretar a lista com IA:', error);
    return null;
  }
};

export const generateTeamNames = async (keywords: string): Promise<string[]> => {
  try {
    const ai = await getClient();
    if (!ai) return ["Os Vingadores do Asfalto", "Tartarugas Ninja", "5km de Alegria", "Corredores de Fim de Semana", "Pernas de Aço"];

    const prompt = `Gere uma lista de 5 nomes criativos, motivadores e levemente engraçados em Português para uma equipe de corrida de rua de 5km. 
    Contexto/Keywords: ${keywords || 'geral'}.
    Retorne APENAS a lista separada por vírgulas, sem numeração ou texto adicional.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "";
    return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return ["Os Vingadores do Asfalto", "Tartarugas Ninja", "5km de Alegria", "Corredores de Fim de Semana", "Pernas de Aço"];
  }
};

export const getTrainingTip = async (age: number, experienceLevel: string): Promise<string> => {
  try {
    const ai = await getClient();
    if (!ai) return "Mantenha a constância e divirta-se!";

    const prompt = `Dê uma dica curta e motivadora de treinamento para uma corrida de 5km para uma pessoa de ${age} anos que se considera ${experienceLevel}. Máximo de 2 frases.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Mantenha a constância e divirta-se!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Lembre-se de se hidratar bem antes e depois da corrida!";
  }
};