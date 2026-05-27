export const pontoPedidoService = {
  calcularPontoPedido(consumoMedioDiario: number, leadTimeDias: number, estoqueSegurancaDias: number) {
    return (consumoMedioDiario * leadTimeDias) + (consumoMedioDiario * estoqueSegurancaDias);
  },
  classificarStatus(estoqueAtual: number, pontoDePedido: number): 'critico' | 'alerta' | 'ok' {
    if (estoqueAtual <= pontoDePedido) return 'critico';
    if (estoqueAtual <= pontoDePedido * 1.3) return 'alerta';
    return 'ok';
  },
};
