import { createContext, useContext, useReducer } from 'react';

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

function lineTotal(unit, qty) {
  return Math.round(unit * qty * 100) / 100;
}

function withQty(line, quantidade) {
  return {
    ...line,
    quantidade,
    valor_total: lineTotal(line.valor_unitario, quantidade),
  };
}

function initialCart() {
  return {
    lines: [],
    clienteId: '',
    formaPagamento: 'dinheiro',
    valorRecebido: '',
    parcelas: '1',
    numeroComanda: '',
    identificacao: '',
    saleId: '',
  };
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const item = action.item;
      const found = state.lines.some((line) => line.produto_id === item.produto_id);
      const lines = found
        ? state.lines.map((line) =>
            line.produto_id === item.produto_id ? withQty(line, line.quantidade + 1) : line
          )
        : [...state.lines, withQty({ ...item, quantidade: 1 }, 1)];
      return { ...state, lines };
    }
    case 'set-qty': {
      const quantidade = Number(action.quantidade);
      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return {
          ...state,
          lines: state.lines.filter((line) => line.produto_id !== action.produto_id),
        };
      }
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.produto_id === action.produto_id ? withQty(line, quantidade) : line
        ),
      };
    }
    case 'set-customer':
      return { ...state, clienteId: action.clienteId || '' };
    case 'set-payment':
      return { ...state, formaPagamento: action.formaPagamento };
    case 'set-received':
      return { ...state, valorRecebido: action.valorRecebido };
    case 'set-installments':
      return { ...state, parcelas: action.parcelas };
    case 'set-comanda':
      return { ...state, numeroComanda: action.numeroComanda };
    case 'set-identity':
      return {
        ...state,
        identificacao: action.identificacao ?? '',
        numeroComanda: action.numeroComanda ?? '',
        clienteId: action.clienteId || '',
      };
    case 'attach':
      return {
        ...state,
        saleId: action.saleId || '',
        numeroComanda: action.numeroComanda != null && action.numeroComanda !== '' ? String(action.numeroComanda) : '',
        clienteId: action.clienteId || '',
        identificacao: action.identificacao ?? '',
        lines: Array.isArray(action.lines)
          ? action.lines.map((line) => withQty(line, line.quantidade))
          : state.lines,
      };
    case 'load': {
      const numero =
        action.numeroComanda != null && action.numeroComanda !== '' ? String(action.numeroComanda) : '';
      const nome = action.clienteNome && action.clienteNome !== 'Consumidor' ? action.clienteNome : '';
      return {
        ...initialCart(),
        lines: (action.lines || []).map((line) => withQty(line, line.quantidade)),
        clienteId: action.clienteId || '',
        numeroComanda: numero,
        identificacao: numero || nome,
        saleId: action.saleId || '',
      };
    }
    case 'clear':
      return initialCart();
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, null, initialCart);
  return (
    <CartDispatchContext.Provider value={dispatch}>
      <CartStateContext.Provider value={state}>{children}</CartStateContext.Provider>
    </CartDispatchContext.Provider>
  );
}

export function useCartState() {
  const state = useContext(CartStateContext);
  if (!state) throw new Error('Carrinho indisponível.');
  return state;
}

export function useCartDispatch() {
  const dispatch = useContext(CartDispatchContext);
  if (!dispatch) throw new Error('Carrinho indisponível.');
  return dispatch;
}
