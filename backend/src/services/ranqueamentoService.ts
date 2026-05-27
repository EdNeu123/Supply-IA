export const ranqueamentoService = {
  ordenarCotacoes(cotacoes: any[]) {
    return cotacoes.sort((a, b) => {
      const pa = a.unitPrice ?? Infinity, pb = b.unitPrice ?? Infinity;
      if (pa !== pb) return pa - pb;
      const da = a.leadTimeDays ?? Infinity, db = b.leadTimeDays ?? Infinity;
      return da - db;
    });
  },
};
