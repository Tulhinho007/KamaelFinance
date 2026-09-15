export function extractCategoryAndNotes(rawNotes: string | null = ""): { category: string; cleanNotes: string } {
  if (!rawNotes) return { category: "", cleanNotes: "" };
  const catMatch = rawNotes.match(/\[cat:([^\]]+)\]/i);
  const category = catMatch ? catMatch[1].trim() : "";
  const cleanNotes = rawNotes.replace(/\[cat:[^\]]+\]/gi, "").trim();
  return { category, cleanNotes };
}

export function detectCategory(description: string = "", notes: string = ""): string {
  const text = `${description} ${notes}`.toLowerCase();
  if (/(hotel|hospedagem|pousada|resort|airbnb|estadia|diária|diaria|hostel|quarto|chalé|chale|pouso)/i.test(text)) {
    return "Hospedagem";
  }
  if (/(transporte|passagem|passagens|ônibus|onibus|voo|aéreo|aereo|avião|aviao|uber|táxi|taxi|combustível|combustivel|gasolina|pedágio|pedagio|transfer|carro|aluguel|rodoviária|rodoviaria|embarque)/i.test(text)) {
    return "Transporte";
  }
  if (/(ingresso|ingressos|passaporte|ticket|tickets|evento|eventos|festival|show|shows|festa|festas|vip|camarote|imagine|legend|atração|atracao|parque|museu)/i.test(text)) {
    return "Ingressos / Eventos";
  }
  if (/(alimentação|alimentacao|comida|comidas|restaurante|restaurantes|almoço|almoco|jantar|lanche|lanches|café|cafe|mercado|supermercado|bebida|bebidas|gasto local|gastos locais|consumo|petisco)/i.test(text)) {
    return "Gastos no Local";
  }
  return "Outros Gastos";
}
