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