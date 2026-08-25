"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Landmark, TrendingUp, Coins, Dice5, Plus, Pencil, Trash2,
  RefreshCw, Sparkles, ArrowUpRight, ArrowDownRight, Wallet, LineChart, ShieldCheck,
  X, DollarSign, PieChart, Layers, ArrowRightLeft, History, FileText, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, ChevronUp, Tag, CornerDownRight, GitCommit, Briefcase
} from "lucide-react";
import { PeriodHeader } from "@/components/period-header";
import { CompoundInterestSimulator } from "@/components/compound-interest-simulator";
import {
  PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  getInvestmentsData, createInvestmentAction, updateInvestmentAction, deleteInvestmentAction, toggleInvestmentStatusAction, InvestmentItem,
  getVariableAssetsData, createVariableAssetAction, addVariableTransactionAction, updateVariableAssetCotacaoAction, updateFullVariableAssetAction, updateVariableTransactionAction, deleteVariableTransactionAction, deleteVariableAssetAction, toggleVariableAssetStatusAction, VariableAssetItem,
  getCryptoAssetsData, createCryptoAssetAction, addCryptoTransactionAction, updateCryptoAssetCotacaoAction, updateFullCryptoAssetAction, updateCryptoTransactionAction, deleteCryptoTransactionAction, deleteCryptoAssetAction, CryptoAssetItem,
  getBettingAccountsData, createBettingAccountAction, addBettingTransactionAction, updateBettingAccountSaldoAction, deleteBettingAccountAction, deleteBettingTransactionAction, updateBettingTransactionAction, BettingAccountItem,
  getOtherInvestmentsData, createOtherInvestmentAction, updateOtherInvestmentAction, deleteOtherInvestmentAction, OtherInvestmentItem,
  getConsolidatedInvestmentsOverview, getMonthlyNetWorthEvolution
} from "@/lib/actions";

const brl = (v: number) => {
  if (v === undefined || v === null || isNaN(v)) return "R$ 0,00";
  const absStr = Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return v < 0 ? `-${absStr}` : absStr;
};

// Formata quantidade de cripto: remove zeros desnecessários, máx 8 casas decimais
const formatCryptoQty = (v: number): string => {
  if (v === 0) return "0";
  // Usa até 8 casas, remove zeros à direita
  const s = v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 8 });
  return s;
};

export default function InvestimentosPage() {
  const [currentTab, setCurrentTab] = useState<"visao-geral" | "renda-fixa" | "renda-variavel" | "cripto" | "apostas" | "outros">("visao-geral");

  // Loaders & Data States
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [netWorthEvolution, setNetWorthEvolution] = useState<any[]>([]);
  const [rendaFixaData, setRendaFixaData] = useState<{ investimentos: InvestmentItem[]; resumo: any; destaques: any } | null>(null);
  const [rendaVariavelData, setRendaVariavelData] = useState<VariableAssetItem[]>([]);
  const [criptoData, setCriptoData] = useState<CryptoAssetItem[]>([]);
  const [apostasData, setApostasData] = useState<BettingAccountItem[]>([]);
  const [outrosData, setOutrosData] = useState<OtherInvestmentItem[]>([]);

  // Filtro de Status
  const [filterRvStatus, setFilterRvStatus] = useState<"ABERTO" | "ENCERRADO" | "TODOS">("ABERTO");
  const [filterCryptoStatus, setFilterCryptoStatus] = useState<"ABERTO" | "ENCERRADO" | "TODOS">("ABERTO");

  // Estado de Acordeão / Submenu Expansível
  const [expandedAssetIds, setExpandedAssetIds] = useState<string[]>([]);
  const [expandedCryptoIds, setExpandedCryptoIds] = useState<string[]>([]);
  const [expandedBetIds, setExpandedBetIds] = useState<string[]>([]);

  const toggleAssetExpand = (id: string) => {
    setExpandedAssetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCryptoExpand = (id: string) => {
    setExpandedCryptoIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleBetExpand = (id: string) => {
    setExpandedBetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Modais State
  const [activeModal, setActiveModal] = useState<
    "rf-create" | "rf-edit" | "rf-delete" |
    "rv-create" | "rv-tx" | "rv-edit-asset" | "rv-tx-edit" | "rv-delete" |
    "crypto-create" | "crypto-tx" | "crypto-edit-asset" | "crypto-tx-edit" | "crypto-delete" |
    "bet-create" | "bet-tx" | "bet-tx-edit" | "bet-edit" | "bet-delete" |
    "outro-create" | "outro-edit" | "outro-delete" | null
  >(null);

  const [saving, setSaving] = useState(false);

  // Selected item states
  const [selectedRf, setSelectedRf] = useState<InvestmentItem | null>(null);
  const [selectedRv, setSelectedRv] = useState<VariableAssetItem | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAssetItem | null>(null);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [selectedBet, setSelectedBet] = useState<BettingAccountItem | null>(null);
  const [selectedOutro, setSelectedOutro] = useState<OtherInvestmentItem | null>(null);

  // Form Fields - Renda Fixa
  const [rfTitulo, setRfTitulo] = useState("");
  const [rfCategoria, setRfCategoria] = useState("CDB");
  const [rfDataInicial, setRfDataInicial] = useState("");
  const [rfValorInvestido, setRfValorInvestido] = useState<number | "">("");
  const [rfValorBruto, setRfValorBruto] = useState<number | "">("");
  const [rfTaxas, setRfTaxas] = useState<number | "">("");
  const [rfImposto, setRfImposto] = useState<number | "">("");

  // Form Fields - Renda Variável (Ativo / Ciclo)
  const [rvTitulo, setRvTitulo] = useState("");
  const [rvCategoria, setRvCategoria] = useState("Ação");
  const [rvCotacaoAtual, setRvCotacaoAtual] = useState<number | "">("");
  const [rvQtdInicial, setRvQtdInicial] = useState<number | "">("");
  const [rvPrecoInicial, setRvPrecoInicial] = useState<number | "">("");
  const [rvDividendos, setRvDividendos] = useState<number | "">("");
  const [rvStatus, setRvStatus] = useState<"ABERTO" | "ENCERRADO">("ABERTO");
  const [rvDestinoMode, setRvDestinoMode] = useState<"NOVO_CICLO" | "ADICIONAR_EXISTENTE">("NOVO_CICLO");

  // Form Fields - RV Transação
  const [rvTxTipo, setRvTxTipo] = useState<"COMPRA" | "VENDA">("COMPRA");
  const [rvTxData, setRvTxData] = useState("");
  const [rvTxQtd, setRvTxQtd] = useState<number | "">("");
  const [rvTxPreco, setRvTxPreco] = useState<number | "">("");
  const [rvTxTaxas, setRvTxTaxas] = useState<number | "">("");
  const [rvTxLoteOrigemId, setRvTxLoteOrigemId] = useState<string>("");

  // Form Fields - Cripto (Ciclo & Transações)
  const [cryptoToken, setCryptoToken] = useState("");
  const [cryptoNome, setCryptoNome] = useState("");
  const [cryptoCotacao, setCryptoCotacao] = useState<number | "">("");
  const [cryptoQtdInicial, setCryptoQtdInicial] = useState<number | "">("");
  const [cryptoPrecoInicial, setCryptoPrecoInicial] = useState<number | "">("");
  const [cryptoStatus, setCryptoStatus] = useState<"ABERTO" | "ENCERRADO">("ABERTO");
  const [cryptoDestinoMode, setCryptoDestinoMode] = useState<"NOVO_CICLO" | "ADICIONAR_EXISTENTE">("NOVO_CICLO");
  // Edit-only states (override para qtd e custo total do ciclo cripto)
  const [cryptoQtdEdit, setCryptoQtdEdit] = useState<number | "">("");
  const [cryptoCustoTotalEdit, setCryptoCustoTotalEdit] = useState<number | "">("");

  // Form Fields - Cripto Transação
  const [cryptoTxTipo, setCryptoTxTipo] = useState<"COMPRA" | "VENDA">("COMPRA");
  const [cryptoTxData, setCryptoTxData] = useState("");
  const [cryptoTxQtd, setCryptoTxQtd] = useState<number | "">("");
  const [cryptoTxPreco, setCryptoTxPreco] = useState<number | "">("");
  const [cryptoTxTaxas, setCryptoTxTaxas] = useState<number | "">("");
  const [cryptoTxLoteOrigemId, setCryptoTxLoteOrigemId] = useState<string>("");

  // Form Fields - Apostas / Bancas
  const [betPlataforma, setBetPlataforma] = useState("");
  const [betSaldoBruto, setBetSaldoBruto] = useState<number | "">("");
  const [betDepositoInicial, setBetDepositoInicial] = useState<number | "">("");

  // Form Fields - Apostas Movimentação
  const [betTxTipo, setBetTxTipo] = useState<"DEPOSITO" | "SAQUE">("DEPOSITO");
  const [betTxValor, setBetTxValor] = useState<number | "">("");
  const [betTxData, setBetTxData] = useState("");
  const [betTxAtualizarSaldo, setBetTxAtualizarSaldo] = useState(true);
  // Edit state for individual bet transactions
  const [selectedBetTx, setSelectedBetTx] = useState<any | null>(null);
  const [betTxEditTipo, setBetTxEditTipo] = useState<"DEPOSITO" | "SAQUE">("DEPOSITO");
  const [betTxEditValor, setBetTxEditValor] = useState<number | "">("");
  const [betTxEditData, setBetTxEditData] = useState("");

  // Form Fields - Outros Investimentos
  const [outroNome, setOutroNome] = useState("");
  const [outroData, setOutroData] = useState("");
  const [outroTotalInvestido, setOutroTotalInvestido] = useState<number | "">("");
  const [outroTaxaImposto, setOutroTaxaImposto] = useState<number | "">("");
  const [outroTotalSaque, setOutroTotalSaque] = useState<number | "">("");

  // Load All Data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ov, nw, rf, rv, cr, bet, out] = await Promise.all([
        getConsolidatedInvestmentsOverview(),
        getMonthlyNetWorthEvolution(),
        getInvestmentsData(),
        getVariableAssetsData(),
        getCryptoAssetsData(),
        getBettingAccountsData(),
        getOtherInvestmentsData()
      ]);
      setOverview(ov);
      setNetWorthEvolution(nw);
      setRendaFixaData(rf);
      setRendaVariavelData(rv);
      setCriptoData(cr);
      setApostasData(bet);
      setOutrosData(out);

      if (selectedRv) {
        const updated = rv.find(a => a.id === selectedRv.id);
        if (updated) setSelectedRv(updated);
      }
      if (selectedCrypto) {
        const updatedC = cr.find(c => c.id === selectedCrypto.id);
        if (updatedC) setSelectedCrypto(updatedC);
      }
      if (selectedOutro) {
        const updatedO = out.find(o => o.id === selectedOutro.id);
        if (updatedO) setSelectedOutro(updatedO);
      }
    } catch (err) {
      console.error("Erro ao carregar módulo de investimentos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  // Tickers já existentes na carteira para autocompletar
  const existingTickers = Array.from(new Set(rendaVariavelData.map(a => a.titulo.toUpperCase())));
  const existingOpenCycle = rendaVariavelData.find(
    a => a.titulo.toUpperCase() === rvTitulo.trim().toUpperCase() && a.status === "ABERTO"
  );

  const existingCryptoTokens = Array.from(new Set(criptoData.map(c => c.token.toUpperCase())));
  const existingCryptoOpenCycle = criptoData.find(
    c => c.token.toUpperCase() === cryptoToken.trim().toUpperCase() && c.status === "ABERTO"
  );

  // Handlers - Renda Fixa
  const handleSaveRf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfTitulo || rfValorInvestido === "" || rfValorBruto === "" || !rfDataInicial) return;
    setSaving(true);
    try {
      const payload = {
        titulo: rfTitulo,
        categoria: rfCategoria,
        data_inicial: rfDataInicial,
        valor_investido: Number(rfValorInvestido),
        valor_atual_bruto: Number(rfValorBruto),
        taxas_acumuladas: rfTaxas === "" ? 0 : Number(rfTaxas),
        imposto_estimado: rfImposto === "" ? 0 : Number(rfImposto)
      };

      if (activeModal === "rf-create") {
        await createInvestmentAction(payload);
      } else if (activeModal === "rf-edit" && selectedRf) {
        await updateInvestmentAction(selectedRf.id, { ...payload, status: selectedRf.status });
      }

      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar Renda Fixa.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRf = async () => {
    if (!selectedRf) return;
    setSaving(true);
    try {
      await deleteInvestmentAction(selectedRf.id);
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handlers - Renda Variável
  const handleSaveRvAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rvTitulo || rvCotacaoAtual === "") return;
    if (rvQtdInicial === "" || Number(rvQtdInicial) <= 0 || rvPrecoInicial === "" || Number(rvPrecoInicial) <= 0) {
      alert("Por favor, informe a quantidade e o preço pago por cota do lote inicial.");
      return;
    }

    setSaving(true);
    try {
      const cleanTicker = rvTitulo.trim().toUpperCase();
      const existingOpen = rendaVariavelData.find(a => a.titulo.toUpperCase() === cleanTicker && a.status === "ABERTO");

      if (existingOpen && rvDestinoMode === "ADICIONAR_EXISTENTE") {
        await addVariableTransactionAction(existingOpen.id, {
          tipo: "COMPRA",
          data: new Date().toISOString().split("T")[0],
          quantidade: Number(rvQtdInicial),
          precoUnitario: Number(rvPrecoInicial),
          taxas: 0
        });
        await updateVariableAssetCotacaoAction(existingOpen.id, Number(rvCotacaoAtual));
      } else {
        await createVariableAssetAction({
          titulo: cleanTicker,
          categoria: rvCategoria,
          cotacaoAtual: Number(rvCotacaoAtual),
          quantidadeInicial: Number(rvQtdInicial),
          precoInicial: Number(rvPrecoInicial),
          dataInicial: new Date().toISOString().split("T")[0]
        });
      }

      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar operação.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFullRvAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRv || !rvTitulo || rvCotacaoAtual === "") return;
    setSaving(true);
    try {
      await updateFullVariableAssetAction(selectedRv.id, {
        titulo: rvTitulo,
        categoria: rvCategoria,
        cotacaoAtual: Number(rvCotacaoAtual),
        dividendosRecebidos: rvDividendos === "" ? 0 : Number(rvDividendos),
        status: rvStatus
      });
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar ciclo.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRvTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRv || rvTxQtd === "" || rvTxPreco === "" || !rvTxData) return;

    const qtdNum = Number(rvTxQtd);
    if (rvTxTipo === "VENDA" && qtdNum > selectedRv.quantidadeCotas) {
      alert(`Atenção: Você está tentando vender ${qtdNum} cotas, mas o ciclo selecionado (${selectedRv.titulo}) possui apenas ${selectedRv.quantidadeCotas} cotas disponíveis.`);
      return;
    }

    setSaving(true);
    try {
      const payloadData = {
        tipo: rvTxTipo,
        data: rvTxData,
        quantidade: qtdNum,
        precoUnitario: Number(rvTxPreco),
        taxas: rvTxTaxas === "" ? 0 : Number(rvTxTaxas),
        loteOrigemId: rvTxTipo === "VENDA" && rvTxLoteOrigemId ? rvTxLoteOrigemId : undefined
      };

      if (activeModal === "rv-tx-edit" && selectedTx) {
        await updateVariableTransactionAction(selectedTx.id, payloadData);
      } else {
        await addVariableTransactionAction(selectedRv.id, payloadData);
      }

      await loadAllData();

      if (rvTxTipo === "VENDA" && qtdNum >= selectedRv.quantidadeCotas) {
        alert(`Venda registrada com sucesso! Como a quantidade vendida (${qtdNum}) zerou a posição do ciclo ${selectedRv.titulo}, o ciclo foi automaticamente ENCERRADO.`);
      }

      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ordem.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRvTx = async (txId: string) => {
    if (!confirm("Tem certeza que deseja apagar esta ordem do histórico?")) return;
    try {
      await deleteVariableTransactionAction(txId);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert("Erro ao apagar ordem.");
    }
  };

  const handleToggleRvStatus = async (asset: VariableAssetItem) => {
    try {
      await toggleVariableAssetStatusAction(asset.id, asset.status);
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRv = async () => {
    if (!selectedRv) return;
    setSaving(true);
    try {
      await deleteVariableAssetAction(selectedRv.id);
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handlers - Criptomoedas (Ciclos & Ordens)
  const handleSaveCryptoAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoToken || !cryptoNome || cryptoCotacao === "") return;
    if (cryptoQtdInicial === "" || Number(cryptoQtdInicial) <= 0 || cryptoPrecoInicial === "" || Number(cryptoPrecoInicial) <= 0) {
      alert("Por favor, informe a quantidade de moedas e o preço unitário pago no aporte inicial.");
      return;
    }

    setSaving(true);
    try {
      const cleanToken = cryptoToken.trim().toUpperCase();
      const existingOpen = criptoData.find(c => c.token.toUpperCase() === cleanToken && c.status === "ABERTO");

      if (existingOpen && cryptoDestinoMode === "ADICIONAR_EXISTENTE") {
        await addCryptoTransactionAction(existingOpen.id, {
          tipo: "COMPRA",
          data: new Date().toISOString().split("T")[0],
          quantidade: Number(cryptoQtdInicial),
          precoUnitario: Number(cryptoPrecoInicial),
          taxas: 0
        });
        await updateCryptoAssetCotacaoAction(existingOpen.id, Number(cryptoCotacao));
      } else {
        await createCryptoAssetAction({
          token: cleanToken,
          nome: cryptoNome,
          cotacaoAtual: Number(cryptoCotacao),
          quantidadeInicial: Number(cryptoQtdInicial),
          precoInicial: Number(cryptoPrecoInicial),
          dataInicial: new Date().toISOString().split("T")[0]
        });
      }

      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar operação cripto.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFullCryptoAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrypto || !cryptoToken || !cryptoNome || cryptoCotacao === "") return;
    setSaving(true);
    try {
      await updateFullCryptoAssetAction(selectedCrypto.id, {
        token: cryptoToken,
        nome: cryptoNome,
        cotacaoAtual: Number(cryptoCotacao),
        status: cryptoStatus,
        quantidadeAjustada: cryptoQtdEdit !== "" && Number(cryptoQtdEdit) > 0 ? Number(cryptoQtdEdit) : undefined,
        custoTotalAjustado: cryptoCustoTotalEdit !== "" ? Number(cryptoCustoTotalEdit) : undefined
      });
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar ciclo cripto.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCryptoTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrypto || cryptoTxQtd === "" || cryptoTxPreco === "" || !cryptoTxData) return;

    const qtdNum = Number(cryptoTxQtd);
    if (cryptoTxTipo === "VENDA" && qtdNum > selectedCrypto.quantidadeMoedas) {
      alert(`Atenção: Você está tentando vender ${qtdNum} moedas, mas o ciclo selecionado possui apenas ${selectedCrypto.quantidadeMoedas} moedas disponíveis.`);
      return;
    }

    setSaving(true);
    try {
      const payloadData = {
        tipo: cryptoTxTipo,
        data: cryptoTxData,
        quantidade: qtdNum,
        precoUnitario: Number(cryptoTxPreco),
        taxas: cryptoTxTaxas === "" ? 0 : Number(cryptoTxTaxas),
        loteOrigemId: cryptoTxTipo === "VENDA" && cryptoTxLoteOrigemId ? cryptoTxLoteOrigemId : undefined
      };

      if (activeModal === "crypto-tx-edit" && selectedTx) {
        await updateCryptoTransactionAction(selectedTx.id, payloadData);
      } else {
        await addCryptoTransactionAction(selectedCrypto.id, payloadData);
      }

      await loadAllData();

      if (cryptoTxTipo === "VENDA" && qtdNum >= selectedCrypto.quantidadeMoedas) {
        alert(`Venda registrada com sucesso! Como a quantidade zerou a posição do ciclo ${selectedCrypto.token}, o ciclo foi automaticamente ENCERRADO.`);
      }

      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ordem de cripto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCryptoTx = async (txId: string) => {
    if (!confirm("Tem certeza que deseja apagar esta ordem cripto do histórico?")) return;
    try {
      await deleteCryptoTransactionAction(txId);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert("Erro ao apagar ordem.");
    }
  };

  const handleDeleteCrypto = async () => {
    if (!selectedCrypto) return;
    setSaving(true);
    try {
      await deleteCryptoAssetAction(selectedCrypto.id);
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handlers - Apostas / Bancas
  const handleSaveBetAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!betPlataforma || betSaldoBruto === "") return;
    setSaving(true);
    try {
      await createBettingAccountAction({
        nomePlataforma: betPlataforma,
        saldoAtualBruto: Number(betSaldoBruto),
        depositoInicial: betDepositoInicial === "" ? 0 : Number(betDepositoInicial)
      });
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar plataforma.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBetTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBet || betTxValor === "" || !betTxData) return;
    setSaving(true);
    try {
      await addBettingTransactionAction(selectedBet.id, {
        tipo: betTxTipo,
        valor: Number(betTxValor),
        data: betTxData,
        atualizarSaldoBanca: betTxAtualizarSaldo
      });
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar movimentação.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBetSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBet || betSaldoBruto === "") return;
    setSaving(true);
    try {
      await updateBettingAccountSaldoAction(selectedBet.id, Number(betSaldoBruto));
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBet = async () => {
    if (!selectedBet) return;
    setSaving(true);
    try {
      await deleteBettingAccountAction(selectedBet.id);
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBetTx = async (txId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta movimentação?")) return;
    try {
      await deleteBettingTransactionAction(txId);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir movimentação.");
    }
  };

  const handleSaveBetTxEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBetTx || betTxEditValor === "" || !betTxEditData) return;
    setSaving(true);
    try {
      await updateBettingTransactionAction(selectedBetTx.id, {
        tipo: betTxEditTipo,
        valor: Number(betTxEditValor),
        data: betTxEditData
      });
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar movimentação.");
    } finally {
      setSaving(false);
    }
  };

  // Handlers - Outros Investimentos
  const openCreateOutroModal = () => {
    setOutroNome("");
    setOutroData(new Date().toISOString().split("T")[0]);
    setOutroTotalInvestido("");
    setOutroTaxaImposto("");
    setOutroTotalSaque("");
    setActiveModal("outro-create");
  };

  const openEditOutroModal = (item: OtherInvestmentItem) => {
    setSelectedOutro(item);
    setOutroNome(item.nome);
    setOutroData(item.data);
    setOutroTotalInvestido(item.totalInvestido || "");
    setOutroTaxaImposto(item.taxaImposto || "");
    setOutroTotalSaque(item.totalSaque || "");
    setActiveModal("outro-edit");
  };

  const handleSaveOutro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nome: outroNome || "Novo Investimento",
        data: outroData,
        totalInvestido: outroTotalInvestido === "" ? 0 : Number(outroTotalInvestido),
        taxaImposto: outroTaxaImposto === "" ? 0 : Number(outroTaxaImposto),
        totalSaque: outroTotalSaque === "" ? 0 : Number(outroTotalSaque)
      };

      if (activeModal === "outro-create") {
        await createOtherInvestmentAction(payload);
      } else if (activeModal === "outro-edit" && selectedOutro) {
        await updateOtherInvestmentAction(selectedOutro.id, payload);
      }

      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar investimento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOutro = async () => {
    if (!selectedOutro) return;
    setSaving(true);
    try {
      await deleteOtherInvestmentAction(selectedOutro.id);
      await loadAllData();
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir investimento.");
    } finally {
      setSaving(false);
    }
  };

  // Listas Filtradas
  const filteredRendaVariavel = [...rendaVariavelData]
    .filter(asset => filterRvStatus === "TODOS" || asset.status === filterRvStatus)
    .sort((a, b) => a.titulo.localeCompare(b.titulo));

  const filteredCripto = [...criptoData]
    .filter(c => filterCryptoStatus === "TODOS" || c.status === filterCryptoStatus)
    .sort((a, b) => a.token.localeCompare(b.token));

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-8 select-none relative">
      
      {/* 1. HEADER */}
      <PeriodHeader 
        title="Módulo de Investimentos"
        tagline="Gestão patrimonial integrada: Renda Fixa, Ciclos de Ações & FIIs, Cripto e Bancas."
      />

      {/* 2. SUB-MENU DE NAVEGAÇÃO DE ABAS */}
      <div className="flex flex-wrap items-center bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-sm gap-1.5 -mt-3">
        <button
          onClick={() => setCurrentTab("visao-geral")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentTab === "visao-geral"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-indigo-400" />
          Visão Geral
        </button>

        <button
          onClick={() => setCurrentTab("renda-fixa")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentTab === "renda-fixa"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Landmark className="w-4 h-4 text-blue-400" />
          Renda Fixa
        </button>

        <button
          onClick={() => setCurrentTab("renda-variavel")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentTab === "renda-variavel"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Ações & FIIs
        </button>

        <button
          onClick={() => setCurrentTab("cripto")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentTab === "cripto"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          Criptomoedas
        </button>

        <button
          onClick={() => setCurrentTab("apostas")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentTab === "apostas"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Dice5 className="w-4 h-4 text-purple-400" />
          Apostas / Bancas
        </button>

        <button
          onClick={() => setCurrentTab("outros")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentTab === "outros"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Briefcase className="w-4 h-4 text-teal-400" />
          Outros Investimentos
        </button>
      </div>

      {/* ── ABA 1: VISÃO GERAL ────────────────────────────────────────────────── */}
      {currentTab === "visao-geral" && (
        <section className="space-y-6 animate-in fade-in">
          
          {/* KPIs Consolidados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-glow p-6 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] flex flex-col justify-between relative overflow-hidden">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-300">Patrimônio Bruto</span>
              <h3 className="text-3xl font-black text-white mt-2 font-tnum tabular-nums">
                {brl(overview?.patrimonioBruto || 0)}
              </h3>
              <span className="text-xs font-semibold text-secondary-light mt-3 block">Total acumulado na carteira corporativa</span>
            </div>

            <div className="card-glow p-6 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex flex-col justify-between relative overflow-hidden">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-300">Patrimônio Líquido</span>
              <h3 className="text-3xl font-black text-emerald-400 mt-2 font-tnum tabular-nums">
                {brl(overview?.patrimonioLiquido || 0)}
              </h3>
              <span className="text-xs font-semibold text-emerald-300 mt-3 block">Após impostos e taxas estimadas</span>
            </div>

            <div className="card-glow p-6 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex flex-col justify-between relative overflow-hidden">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-300">Lucro Total Acumulado</span>
              <h3 className={`text-3xl font-black mt-2 font-tnum tabular-nums ${(overview?.lucroTotal || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {(overview?.lucroTotal || 0) >= 0 ? "+" : ""}{brl(overview?.lucroTotal || 0)}
              </h3>
              <span className={`text-xs font-extrabold mt-3 block ${(overview?.rentabilidadeGeral || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                Rentabilidade geral: {(overview?.rentabilidadeGeral || 0) >= 0 ? "+" : ""}{(overview?.rentabilidadeGeral || 0).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Cards de Resumo por Categoria */}
          {overview?.categorias && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              
              {/* Renda Fixa */}
              <div 
                onClick={() => setCurrentTab("renda-fixa")}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase">
                    {overview.categorias.rendaFixa.qtd} ativo(s)
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Renda Fixa</p>
                <p className="text-xl font-black text-slate-900 mt-1">{brl(overview.categorias.rendaFixa.bruto)}</p>
                <p className="text-xs font-semibold text-emerald-600 mt-2">
                  Lucro: +{brl(overview.categorias.rendaFixa.lucro)}
                </p>
              </div>

              {/* Ações & FIIs */}
              <div 
                onClick={() => setCurrentTab("renda-variavel")}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                    {overview.categorias.rendaVariavel.qtd} ciclo(s)
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ações & FIIs</p>
                <p className="text-xl font-black text-slate-900 mt-1">{brl(overview.categorias.rendaVariavel.bruto)}</p>
                <p className="text-xs font-semibold text-emerald-600 mt-2">
                  Lucro Total: +{brl(overview.categorias.rendaVariavel.lucro)}
                </p>
              </div>

              {/* Cripto */}
              <div 
                onClick={() => setCurrentTab("cripto")}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Coins className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                    {overview.categorias.cripto.qtd} ciclo(s)
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Criptomoedas</p>
                <p className="text-xl font-black text-slate-900 mt-1">{brl(overview.categorias.cripto.bruto)}</p>
                <p className={`text-xs font-semibold mt-2 ${overview.categorias.cripto.lucro >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  Lucro: {overview.categorias.cripto.lucro >= 0 ? "+" : ""}{brl(overview.categorias.cripto.lucro)}
                </p>
              </div>

              {/* Apostas / Bancas */}
              <div 
                onClick={() => setCurrentTab("apostas")}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Dice5 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full uppercase">
                    {overview.categorias.apostas.qtd} banca(s)
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bancas & Apostas</p>
                <p className="text-xl font-black text-slate-900 mt-1">{brl(overview.categorias.apostas.saldoBruto)}</p>
                <p className={`text-xs font-semibold mt-2 ${overview.categorias.apostas.lucro >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  Lucro Real: {overview.categorias.apostas.lucro >= 0 ? "+" : ""}{brl(overview.categorias.apostas.lucro)}
                </p>
              </div>

              {/* Outros Investimentos */}
              <div 
                onClick={() => setCurrentTab("outros")}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full uppercase">
                    {overview.categorias.outros?.qtd || 0} ativo(s)
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outros Investimentos</p>
                <p className="text-xl font-black text-slate-900 mt-1">{brl(overview.categorias.outros?.investido || 0)}</p>
                <p className={`text-xs font-semibold mt-2 ${(overview.categorias.outros?.lucro || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  Lucro Real: {(overview.categorias.outros?.lucro || 0) >= 0 ? "+" : ""}{brl(overview.categorias.outros?.lucro || 0)}
                </p>
              </div>

            </div>
          )}

          {/* ── 2. SEÇÃO DE GRÁFICOS: ALOCAÇÃO DE ATIVOS & EVOLUÇÃO PATRIMONIAL ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico 1: Alocação de Ativos (Donut / Pizza) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-500" /> Alocação da Carteira (% Ativos)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Divisão proporcional do patrimônio bruto investido por classe.
                  </p>
                </div>
              </div>

              {overview?.allocationDonutData && overview.allocationDonutData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 h-64">
                  <div className="w-full sm:w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={overview.allocationDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {overview.allocationDonutData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(val: any) => [brl(Number(val)), "Valor Atual"]} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legenda Dinâmica com Percentuais */}
                  <div className="w-full sm:w-1/2 flex flex-col gap-2.5">
                    {overview.allocationDonutData.map((item: any) => (
                      <div key={item.name} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-tnum tabular-nums">
                          <span className="font-semibold text-slate-500">{brl(item.value)}</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full text-[10px]">
                            {item.pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs font-bold text-slate-400">
                  Nenhum ativo cadastrado para exibir alocação.
                </div>
              )}
            </div>

            {/* Gráfico 2: Evolução Patrimonial Mensal (Empilhado) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-emerald-500" /> Evolução Patrimonial ({new Date().getFullYear()})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Crescimento do patrimônio líquido consolidado mês a mês.
                  </p>
                </div>
              </div>

              <div className="w-full h-64">
                {netWorthEvolution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={netWorthEvolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`}
                      />
                      <RechartsTooltip formatter={(val: any, name: any) => [brl(Number(val)), name === "contas" ? "Contas Correntes" : name === "investimentos" ? "Investimentos Totais" : "Passivos/Faturas"]} />
                      <Bar dataKey="contas" name="Contas Correntes" stackId="a" fill="#6366F1" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="investimentos" name="Investimentos Totais" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 animate-pulse">
                    Carregando evolução patrimonial...
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── 3. SIMULADOR DE JUROS COMPOSTOS INTEGRADO ── */}
          <CompoundInterestSimulator />

        </section>
      )}

      {/* ── ABA 2: RENDA FIXA ─────────────────────────────────────────────────── */}
      {currentTab === "renda-fixa" && (
        <section className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Carteira de Renda Fixa</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">CDBs, Tesouro Direto, LCIs e LCAs com projeção de imposto e taxas.</p>
            </div>
            <button 
              onClick={() => {
                setRfTitulo(""); setRfCategoria("CDB");
                setRfDataInicial(new Date().toISOString().split("T")[0]);
                setRfValorInvestido(""); setRfValorBruto(""); setRfTaxas(""); setRfImposto("");
                setSelectedRf(null);
                setActiveModal("rf-create");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-extrabold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo Investimento
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-[28px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase bg-slate-50/50">
                    <th className="p-4">Título & Tipo</th>
                    <th className="p-4 text-center">Data Inicial</th>
                    <th className="p-4 text-right">Investido</th>
                    <th className="p-4 text-right">Bruto Atual</th>
                    <th className="p-4 text-right">Lucro / Rendimento</th>
                    <th className="p-4 text-right">Impostos / Taxas</th>
                    <th className="p-4 text-right">Valor Líquido</th>
                    <th className="p-4 text-center whitespace-nowrap min-w-[120px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {rendaFixaData?.investimentos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">Nenhum investimento de Renda Fixa cadastrado.</td>
                    </tr>
                  ) : (
                    rendaFixaData?.investimentos.map(inv => {
                      const lucro = inv.valor_atual_bruto - inv.valor_investido;
                      const rent = inv.valor_investido > 0 ? (lucro / inv.valor_investido) * 100 : 0;
                      const liquido = inv.valor_atual_bruto - inv.imposto_estimado - inv.taxas_acumuladas;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4">
                            <p className="font-extrabold text-slate-900">{inv.titulo}</p>
                            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 mt-1">
                              {inv.categoria}
                            </span>
                          </td>
                          <td className="p-4 text-center text-slate-500 font-medium">
                            {formatDateDisplay(inv.data_inicial)}
                          </td>
                          <td className="p-4 text-right font-bold text-slate-800">{brl(inv.valor_investido)}</td>
                          <td className="p-4 text-right font-black text-slate-900">{brl(inv.valor_atual_bruto)}</td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <p className={`font-black whitespace-nowrap ${lucro >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {lucro >= 0 ? "+" : ""}{brl(lucro)}
                            </p>
                            <p className={`text-[10px] font-bold whitespace-nowrap ${rent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              ({rent >= 0 ? "+" : ""}{rent.toFixed(2)}%)
                            </p>
                          </td>
                          <td className="p-4 text-right text-slate-500 font-medium">
                            {brl(inv.imposto_estimado + inv.taxas_acumuladas)}
                          </td>
                          <td className="p-4 text-right">
                            <strong className="text-slate-900 font-black text-sm">{brl(liquido)}</strong>
                          </td>
                          <td className="p-4 text-center whitespace-nowrap min-w-[120px]">
                            <div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedRf(inv);
                                  setRfTitulo(inv.titulo); setRfCategoria(inv.categoria);
                                  setRfDataInicial(inv.data_inicial); setRfValorInvestido(inv.valor_investido);
                                  setRfValorBruto(inv.valor_atual_bruto); setRfTaxas(inv.taxas_acumuladas); setRfImposto(inv.imposto_estimado);
                                  setActiveModal("rf-edit");
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedRf(inv); setActiveModal("rf-delete"); }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── ABA 3: RENDA VARIÁVEL (AÇÕES & FIIs) ── */}
      {currentTab === "renda-variavel" && (
        <section className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Ações e Fundos Imobiliários (Ciclos de Operação)</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Expanda o ciclo para visualizar a árvore de lotes e suas vendas aninhadas logo abaixo.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold text-slate-600">
                {(["ABERTO", "ENCERRADO", "TODOS"] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterRvStatus(st)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterRvStatus === st
                        ? "bg-white text-slate-900 shadow-sm"
                        : "hover:text-slate-900 text-slate-500"
                    }`}
                  >
                    {st === "ABERTO" ? "Ciclos Abertos" : st === "ENCERRADO" ? "Encerrados" : "Todos"}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => {
                  setRvTitulo(""); setRvCategoria("Ação"); setRvCotacaoAtual("");
                  setRvQtdInicial(""); setRvPrecoInicial(""); setRvDestinoMode("NOVO_CICLO");
                  setActiveModal("rv-create");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-extrabold transition flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Novo Ativo / Novo Ciclo
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-[28px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase bg-slate-50/50">
                    <th className="p-4">Ativo & Categoria</th>
                    <th className="p-4 text-center">Qtd. Cotas</th>
                    <th className="p-4 text-right">Preço Médio</th>
                    <th className="p-4 text-right">Cotação Atual</th>
                    <th className="p-4 text-right">Valor Investido</th>
                    <th className="p-4 text-right">Valor Bruto</th>
                    <th className="p-4 text-right">Proventos / Dividendos</th>
                    <th className="p-4 text-right">Lucro Total</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Ações & Histórico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredRendaVariavel.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Nenhum ciclo de Renda Variável encontrado neste filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredRendaVariavel.map(asset => {
                      const isExpanded = expandedAssetIds.includes(asset.id);
                      const compras = asset.transacoes.filter(t => t.tipo === "COMPRA");
                      const vendas = asset.transacoes.filter(t => t.tipo === "VENDA");

                      const getVendasDoLote = (buyTx: any) => {
                        return vendas.filter(s => {
                          if (s.loteOrigemId === buyTx.id) return true;
                          if (!s.loteOrigemId && s.lotesOrigemInfo?.includes(`Lote #${buyTx.loteNumero}`)) return true;
                          return false;
                        });
                      };

                      const vendasVinculadasIds = new Set(compras.flatMap(b => getVendasDoLote(b).map(s => s.id)));
                      const vendasAvulsas = vendas.filter(s => !vendasVinculadasIds.has(s.id));

                      return (
                        <React.Fragment key={asset.id}>
                          <tr 
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                              asset.status === "ENCERRADO" ? "opacity-75 bg-slate-50/30" : ""
                            } ${isExpanded ? "bg-blue-50/20" : ""}`}
                            onClick={() => toggleAssetExpand(asset.id)}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleAssetExpand(asset.id); }} className="p-1 text-slate-400 hover:text-blue-600 rounded-lg">
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                <div>
                                  <p className="font-extrabold text-slate-900">{asset.titulo}</p>
                                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 mt-0.5">{asset.categoria}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center font-bold text-slate-800">{asset.quantidadeCotas}</td>
                            <td className="p-4 text-right font-medium text-slate-700">{brl(asset.precoMedio)}</td>
                            <td className="p-4 text-right font-bold text-slate-900">{brl(asset.cotacaoAtual)}</td>
                            <td className="p-4 text-right font-bold text-slate-800">{brl(asset.valorInvestidoLiquido)}</td>
                            <td className="p-4 text-right font-black text-slate-900">{brl(asset.valorAtualBruto)}</td>
                            <td className="p-4 text-right text-emerald-600 font-bold">+{brl(asset.dividendosRecebidos)}</td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <p className={`font-black whitespace-nowrap ${asset.lucroBruto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{asset.lucroBruto >= 0 ? "+" : ""}{brl(asset.lucroBruto)}</p>
                              <p className={`text-[10px] font-bold whitespace-nowrap ${asset.rentabilidade >= 0 ? "text-emerald-600" : "text-rose-600"}`}>({asset.rentabilidade >= 0 ? "+" : ""}{asset.rentabilidade.toFixed(2)}%)</p>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${asset.status === "ABERTO" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{asset.status}</span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap min-w-[160px]" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap">
                                <button onClick={() => toggleAssetExpand(asset.id)} title="Expandir Histórico" className={`p-1.5 rounded-lg flex items-center gap-1 ${isExpanded ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-400 hover:text-blue-600"}`}>
                                  <History className="w-4 h-4" /><span className="text-[10px] font-extrabold">{asset.transacoes.length}</span>
                                </button>
                                <button onClick={() => { setSelectedRv(asset); setRvTxTipo("COMPRA"); setRvTxData(new Date().toISOString().split("T")[0]); setRvTxQtd(""); setRvTxPreco(asset.cotacaoAtual); setRvTxTaxas(""); setRvTxLoteOrigemId(""); setSelectedTx(null); setActiveModal("rv-tx"); }} title="Lançar Ordem" className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg"><ArrowRightLeft className="w-4 h-4" /></button>
                                <button onClick={() => { setSelectedRv(asset); setRvTitulo(asset.titulo); setRvCategoria(asset.categoria); setRvCotacaoAtual(asset.cotacaoAtual); setRvDividendos(asset.dividendosRecebidos); setRvStatus(asset.status); setActiveModal("rv-edit-asset"); }} title="Editar Ciclo" className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleToggleRvStatus(asset)} title="Alternar Status" className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></button>
                                <button onClick={() => { setSelectedRv(asset); setActiveModal("rv-delete"); }} title="Excluir Ciclo" className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>

                          {/* Submenu Árvore Ações */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="p-0 bg-slate-50/80 border-b border-slate-200/60">
                                <div className="p-5 flex flex-col gap-4 bg-slate-50/90 border-l-4 border-l-blue-500 rounded-b-2xl shadow-inner my-1 mx-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-2"><History className="w-4 h-4 text-blue-600" />Árvore Hierárquica de Lotes ({asset.titulo})</h4>
                                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Vendas aninhadas debaixo do Lote de Compra de origem.</p>
                                    </div>
                                    <button onClick={() => { setSelectedRv(asset); setRvTxTipo("COMPRA"); setRvTxData(new Date().toISOString().split("T")[0]); setRvTxQtd(""); setRvTxPreco(asset.cotacaoAtual); setRvTxTaxas(""); setRvTxLoteOrigemId(""); setSelectedTx(null); setActiveModal("rv-tx"); }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm"><Plus className="w-3.5 h-3.5" /> Nova Ordem / Aporte</button>
                                  </div>

                                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase">
                                          <th className="p-3">Estrutura do Lote / Vendas</th><th className="p-3 text-center">Tipo</th><th className="p-3 text-center">Qtd. Cotas</th><th className="p-3 text-right">Preço Unit.</th><th className="p-3 text-right">Taxas</th><th className="p-3 text-right">Total Ordem</th><th className="p-3 text-right">Lucro Realizado (Direcionado)</th><th className="p-3 text-center">Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                        {compras.map(buyTx => (
                                          <React.Fragment key={buyTx.id}>
                                            <tr className="bg-slate-50/70 hover:bg-slate-100/70 font-bold border-t border-slate-200/60">
                                              <td className="p-3"><div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white shadow-sm"><Tag className="w-3 h-3" />Lote #{buyTx.loteNumero}</span><span className="text-slate-900 font-extrabold text-xs">{formatDateDisplay(buyTx.data)}</span></div></td>
                                              <td className="p-3 text-center"><span className="text-[9px] font-extrabold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">COMPRA</span></td>
                                              <td className="p-3 text-center font-black text-slate-900">{buyTx.quantidade} cotas</td>
                                              <td className="p-3 text-right text-slate-800 font-bold">{brl(buyTx.precoUnitario)}</td>
                                              <td className="p-3 text-right text-slate-500 font-medium">{brl(buyTx.taxas)}</td>
                                              <td className="p-3 text-right font-black text-slate-900">{brl((buyTx.quantidade * buyTx.precoUnitario) + buyTx.taxas)}</td>
                                              <td className="p-3 text-right"><span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-200 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Aporte do Lote</span></td>
                                              <td className="p-3 text-center whitespace-nowrap min-w-[100px]"><div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap"><button onClick={() => { setSelectedRv(asset); setSelectedTx(buyTx); setRvTxTipo(buyTx.tipo); setRvTxData(buyTx.data); setRvTxQtd(buyTx.quantidade); setRvTxPreco(buyTx.precoUnitario); setRvTxTaxas(buyTx.taxas); setRvTxLoteOrigemId(""); setActiveModal("rv-tx-edit"); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteRvTx(buyTx.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                            </tr>
                                            {getVendasDoLote(buyTx).map(saleTx => (
                                              <tr key={saleTx.id} className="bg-rose-50/20 hover:bg-rose-50/50 transition-colors border-l-4 border-l-rose-400">
                                                <td className="p-3 pl-8"><div className="flex items-center gap-2"><CornerDownRight className="w-3.5 h-3.5 text-rose-500 font-bold shrink-0" /><span className="text-slate-800 font-bold text-xs">Venda Abatida</span><span className="text-[10px] text-slate-400 font-medium">({formatDateDisplay(saleTx.data)})</span></div></td>
                                                <td className="p-3 text-center"><span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 uppercase">VENDA</span></td>
                                                <td className="p-3 text-center font-extrabold text-rose-900">-{saleTx.quantidade} cotas</td>
                                                <td className="p-3 text-right text-slate-800">{brl(saleTx.precoUnitario)}</td>
                                                <td className="p-3 text-right text-slate-500 font-medium">{brl(saleTx.taxas)}</td>
                                                <td className="p-3 text-right font-black text-slate-900">{brl((saleTx.quantidade * saleTx.precoUnitario) + saleTx.taxas)}</td>
                                                <td className="p-3 text-right"><p className={`font-black ${(saleTx.lucroRealizadoVenda || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{(saleTx.lucroRealizadoVenda || 0) >= 0 ? "+" : ""}{brl(saleTx.lucroRealizadoVenda || 0)}</p><p className="text-[9px] font-bold text-rose-600/80 truncate max-w-[200px]" title={saleTx.lotesOrigemInfo}>Abatido do Lote #{buyTx.loteNumero}</p></td>
                                                <td className="p-3 text-center whitespace-nowrap min-w-[100px]"><div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap"><button onClick={() => { setSelectedRv(asset); setSelectedTx(saleTx); setRvTxTipo(saleTx.tipo); setRvTxData(saleTx.data); setRvTxQtd(saleTx.quantidade); setRvTxPreco(saleTx.precoUnitario); setRvTxTaxas(saleTx.taxas); setRvTxLoteOrigemId(saleTx.loteOrigemId || buyTx.id); setActiveModal("rv-tx-edit"); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteRvTx(saleTx.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                              </tr>
                                            ))}
                                          </React.Fragment>
                                        ))}
                                        {vendasAvulsas.map(saleTx => (
                                          <tr key={saleTx.id} className="bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-400">
                                            <td className="p-3"><div className="flex items-center gap-2"><span className="text-slate-800 font-bold text-xs">{formatDateDisplay(saleTx.data)}</span><span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">FIFO Geral</span></div></td>
                                            <td className="p-3 text-center"><span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 uppercase">VENDA</span></td>
                                            <td className="p-3 text-center font-black text-rose-900">-{saleTx.quantidade} cotas</td>
                                            <td className="p-3 text-right text-slate-800">{brl(saleTx.precoUnitario)}</td>
                                            <td className="p-3 text-right text-slate-500 font-medium">{brl(saleTx.taxas)}</td>
                                            <td className="p-3 text-right font-black text-slate-900">{brl((saleTx.quantidade * saleTx.precoUnitario) + saleTx.taxas)}</td>
                                            <td className="p-3 text-right"><p className={`font-black ${(saleTx.lucroRealizadoVenda || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{(saleTx.lucroRealizadoVenda || 0) >= 0 ? "+" : ""}{brl(saleTx.lucroRealizadoVenda || 0)}</p></td>
                                            <td className="p-3 text-center whitespace-nowrap min-w-[100px]"><div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap"><button onClick={() => { setSelectedRv(asset); setSelectedTx(saleTx); setRvTxTipo(saleTx.tipo); setRvTxData(saleTx.data); setRvTxQtd(saleTx.quantidade); setRvTxPreco(saleTx.precoUnitario); setRvTxTaxas(saleTx.taxas); setRvTxLoteOrigemId(""); setActiveModal("rv-tx-edit"); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteRvTx(saleTx.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── ABA 4: CRIPTOMOEDAS (REPLICANDO CICLOS, SUBMENU DE LOTES E PREÇO MÉDIO) ── */}
      {currentTab === "cripto" && (
        <section className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Carteira de Criptomoedas & Staking (Ciclos de Operação)</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Controle por ciclos independentes, Preço Médio e árvore de lotes com vendas aninhadas.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filtro Status Cripto */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold text-slate-600">
                {(["ABERTO", "ENCERRADO", "TODOS"] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterCryptoStatus(st)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterCryptoStatus === st
                        ? "bg-white text-slate-900 shadow-sm"
                        : "hover:text-slate-900 text-slate-500"
                    }`}
                  >
                    {st === "ABERTO" ? "Ciclos Abertos" : st === "ENCERRADO" ? "Encerrados" : "Todos"}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => {
                  setCryptoToken(""); setCryptoNome(""); setCryptoCotacao("");
                  setCryptoQtdInicial(""); setCryptoPrecoInicial(""); setCryptoDestinoMode("NOVO_CICLO");
                  setActiveModal("crypto-create");
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2.5 rounded-xl font-extrabold transition flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Novo Ativo / Novo Ciclo Cripto
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-[28px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase bg-slate-50/50">
                    <th className="p-4">Token &amp; Nome</th>
                    <th className="p-4 text-center">Qtd. Moedas</th>
                    <th className="p-4 text-right">Preço Médio</th>
                    <th className="p-4 text-right">Cotação Atual</th>
                    <th className="p-4 text-right">Investido</th>
                    <th className="p-4 text-right">Valor Bruto</th>
                    <th className="p-4 text-right">Lucro Total</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center whitespace-nowrap min-w-[160px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">

                  {filteredCripto.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">Nenhum ciclo cripto encontrado neste filtro.</td>
                    </tr>
                  ) : (
                    filteredCripto.map(crypto => {
                      const isExpanded = expandedCryptoIds.includes(crypto.id);
                      const compras = crypto.transacoes.filter(t => t.tipo === "COMPRA");
                      const vendas = crypto.transacoes.filter(t => t.tipo === "VENDA");

                      const getVendasDoLote = (buyTx: any) => {
                        return vendas.filter(s => {
                          if (s.loteOrigemId === buyTx.id) return true;
                          if (!s.loteOrigemId && s.lotesOrigemInfo?.includes(`Lote #${buyTx.loteNumero}`)) return true;
                          return false;
                        });
                      };

                      const vendasVinculadasIds = new Set(compras.flatMap(b => getVendasDoLote(b).map(s => s.id)));
                      const vendasAvulsas = vendas.filter(s => !vendasVinculadasIds.has(s.id));

                      return (
                        <React.Fragment key={crypto.id}>
                          {/* LINHA PRINCIPAL DO CICLO CRIPTO */}
                          <tr 
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                              crypto.status === "ENCERRADO" ? "opacity-75 bg-slate-50/30" : ""
                            } ${isExpanded ? "bg-amber-50/20" : ""}`}
                            onClick={() => toggleCryptoExpand(crypto.id)}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleCryptoExpand(crypto.id); }} className="p-1 text-slate-400 hover:text-amber-600 rounded-lg">
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                <div>
                                  <p className="font-extrabold text-slate-900">{crypto.token}</p>
                                  <span className="text-[10px] text-slate-500 font-medium">{crypto.nome}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 text-center font-bold text-slate-800 truncate">{formatCryptoQty(crypto.quantidadeMoedas)}</td>
                            <td className="p-4 text-right font-medium text-slate-700 truncate">{brl(crypto.precoMedio)}</td>
                            <td className="p-4 text-right font-bold text-slate-900 truncate">{brl(crypto.cotacaoAtual)}</td>
                            <td className="p-4 text-right font-bold text-slate-800 truncate">{brl(crypto.custoTotalInvestido)}</td>
                            <td className="p-4 text-right font-black text-slate-900 truncate">{brl(crypto.valorAtualBruto)}</td>

                            <td className="p-4 text-right whitespace-nowrap">
                              <p className={`font-black whitespace-nowrap ${crypto.lucroReal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {crypto.lucroReal >= 0 ? "+" : ""}{brl(crypto.lucroReal)}
                              </p>
                              <p className={`text-[10px] font-bold whitespace-nowrap ${crypto.rentabilidade >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                ({crypto.rentabilidade >= 0 ? "+" : ""}{crypto.rentabilidade.toFixed(2)}%)
                              </p>
                            </td>

                            <td className="p-4 text-center">
                              <span className={`inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                crypto.status === "ABERTO" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}>
                                {crypto.status}
                              </span>
                            </td>

                            <td className="p-4 text-center whitespace-nowrap min-w-[160px]" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap">
                                <button onClick={() => toggleCryptoExpand(crypto.id)} title="Expandir Árvore de Lotes" className={`p-1.5 rounded-lg flex items-center gap-1 ${isExpanded ? "bg-amber-100 text-amber-800 font-bold" : "text-slate-400 hover:text-amber-600"}`}>
                                  <History className="w-4 h-4" /><span className="text-[10px] font-extrabold">{crypto.transacoes.length}</span>
                                </button>

                                <button onClick={() => { setSelectedCrypto(crypto); setCryptoTxTipo("COMPRA"); setCryptoTxData(new Date().toISOString().split("T")[0]); setCryptoTxQtd(""); setCryptoTxPreco(crypto.cotacaoAtual); setCryptoTxTaxas(""); setCryptoTxLoteOrigemId(""); setSelectedTx(null); setActiveModal("crypto-tx"); }} title="Lançar Ordem Cripto" className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg">
                                  <ArrowRightLeft className="w-4 h-4" />
                                </button>

                                <button onClick={() => { setSelectedCrypto(crypto); setCryptoToken(crypto.token); setCryptoNome(crypto.nome); setCryptoCotacao(crypto.cotacaoAtual); setCryptoStatus(crypto.status); setCryptoQtdEdit(crypto.quantidadeMoedas); setCryptoCustoTotalEdit(crypto.custoTotalInvestido); setActiveModal("crypto-edit-asset"); }} title="Editar Ciclo Cripto" className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg">
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button onClick={() => { setSelectedCrypto(crypto); setActiveModal("crypto-delete"); }} title="Excluir Ciclo" className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Submenu Árvore Hierárquica Cripto */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="p-0 bg-slate-50/80 border-b border-slate-200/60">
                                <div className="p-5 flex flex-col gap-4 bg-amber-50/40 border-l-4 border-l-amber-500 rounded-b-2xl shadow-inner my-1 mx-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-2"><History className="w-4 h-4 text-amber-600" />Árvore de Lotes Cripto & Vendas ({crypto.token})</h4>
                                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Identificação visual dos Lotes de Compra e vendas abatidas.</p>
                                    </div>
                                    <button onClick={() => { setSelectedCrypto(crypto); setCryptoTxTipo("COMPRA"); setCryptoTxData(new Date().toISOString().split("T")[0]); setCryptoTxQtd(""); setCryptoTxPreco(crypto.cotacaoAtual); setCryptoTxTaxas(""); setCryptoTxLoteOrigemId(""); setSelectedTx(null); setActiveModal("crypto-tx"); }} className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm"><Plus className="w-3.5 h-3.5" /> Nova Ordem / Aporte Cripto</button>
                                  </div>

                                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase">
                                          <th className="p-3">Estrutura do Lote / Vendas</th><th className="p-3 text-center">Tipo</th><th className="p-3 text-center">Qtd. Moedas</th><th className="p-3 text-right">Preço Unit.</th><th className="p-3 text-right">Taxas</th><th className="p-3 text-right">Total Ordem</th><th className="p-3 text-right">Lucro Realizado (Direcionado)</th><th className="p-3 text-center whitespace-nowrap">Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                        {compras.map(buyTx => (
                                          <React.Fragment key={buyTx.id}>
                                            <tr className="bg-slate-50/70 hover:bg-slate-100/70 font-bold border-t border-slate-200/60">
                                              <td className="p-3"><div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-amber-600 text-white shadow-sm"><Tag className="w-3 h-3" />Lote #{buyTx.loteNumero}</span><span className="text-slate-900 font-extrabold text-xs">{formatDateDisplay(buyTx.data)}</span></div></td>
                                              <td className="p-3 text-center"><span className="text-[9px] font-extrabold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">COMPRA</span></td>
                                              <td className="p-3 text-center font-black text-slate-900">{formatCryptoQty(buyTx.quantidade)} moedas</td>
                                              <td className="p-3 text-right text-slate-800 font-bold">{brl(buyTx.precoUnitario)}</td>
                                              <td className="p-3 text-right text-slate-500 font-medium">{brl(buyTx.taxas)}</td>
                                              <td className="p-3 text-right font-black text-slate-900">{brl((buyTx.quantidade * buyTx.precoUnitario) + buyTx.taxas)}</td>
                                              <td className="p-3 text-right"><span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-200 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Aporte do Lote</span></td>
                                              <td className="p-3 text-center whitespace-nowrap min-w-[100px]"><div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap"><button onClick={() => { setSelectedCrypto(crypto); setSelectedTx(buyTx); setCryptoTxTipo(buyTx.tipo); setCryptoTxData(buyTx.data); setCryptoTxQtd(buyTx.quantidade); setCryptoTxPreco(buyTx.precoUnitario); setCryptoTxTaxas(buyTx.taxas); setCryptoTxLoteOrigemId(""); setActiveModal("crypto-tx-edit"); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteCryptoTx(buyTx.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                            </tr>
                                            {getVendasDoLote(buyTx).map(saleTx => (
                                              <tr key={saleTx.id} className="bg-rose-50/20 hover:bg-rose-50/50 transition-colors border-l-4 border-l-rose-400">
                                                <td className="p-3 pl-8"><div className="flex items-center gap-2"><CornerDownRight className="w-3.5 h-3.5 text-rose-500 font-bold shrink-0" /><span className="text-slate-800 font-bold text-xs">Venda Abatida</span><span className="text-[10px] text-slate-400 font-medium">({formatDateDisplay(saleTx.data)})</span></div></td>
                                                <td className="p-3 text-center"><span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 uppercase">VENDA</span></td>
                                                <td className="p-3 text-center font-extrabold text-rose-900">-{formatCryptoQty(saleTx.quantidade)} moedas</td>
                                                <td className="p-3 text-right text-slate-800">{brl(saleTx.precoUnitario)}</td>
                                                <td className="p-3 text-right text-slate-500 font-medium">{brl(saleTx.taxas)}</td>
                                                <td className="p-3 text-right font-black text-slate-900">{brl((saleTx.quantidade * saleTx.precoUnitario) + saleTx.taxas)}</td>
                                                <td className="p-3 text-right"><p className={`font-black ${(saleTx.lucroRealizadoVenda || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{(saleTx.lucroRealizadoVenda || 0) >= 0 ? "+" : ""}{brl(saleTx.lucroRealizadoVenda || 0)}</p><p className="text-[9px] font-bold text-rose-600/80 truncate max-w-[200px]" title={saleTx.lotesOrigemInfo}>Abatido do Lote #{buyTx.loteNumero}</p></td>
                                                <td className="p-3 text-center whitespace-nowrap min-w-[100px]"><div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap"><button onClick={() => { setSelectedCrypto(crypto); setSelectedTx(saleTx); setCryptoTxTipo(saleTx.tipo); setCryptoTxData(saleTx.data); setCryptoTxQtd(saleTx.quantidade); setCryptoTxPreco(saleTx.precoUnitario); setCryptoTxTaxas(saleTx.taxas); setCryptoTxLoteOrigemId(saleTx.loteOrigemId || buyTx.id); setActiveModal("crypto-tx-edit"); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteCryptoTx(saleTx.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                              </tr>
                                            ))}
                                          </React.Fragment>
                                        ))}
                                        {vendasAvulsas.map(saleTx => (
                                          <tr key={saleTx.id} className="bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-400">
                                            <td className="p-3"><div className="flex items-center gap-2"><span className="text-slate-800 font-bold text-xs">{formatDateDisplay(saleTx.data)}</span><span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">FIFO Geral</span></div></td>
                                            <td className="p-3 text-center"><span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 uppercase">VENDA</span></td>
                                            <td className="p-3 text-center font-black text-rose-900">-{formatCryptoQty(saleTx.quantidade)} moedas</td>
                                            <td className="p-3 text-right text-slate-800">{brl(saleTx.precoUnitario)}</td>
                                            <td className="p-3 text-right text-slate-500 font-medium">{brl(saleTx.taxas)}</td>
                                            <td className="p-3 text-right font-black text-slate-900">{brl((saleTx.quantidade * saleTx.precoUnitario) + saleTx.taxas)}</td>
                                            <td className="p-3 text-right"><p className={`font-black ${(saleTx.lucroRealizadoVenda || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{(saleTx.lucroRealizadoVenda || 0) >= 0 ? "+" : ""}{brl(saleTx.lucroRealizadoVenda || 0)}</p></td>
                                            <td className="p-3 text-center whitespace-nowrap min-w-[100px]"><div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap"><button onClick={() => { setSelectedCrypto(crypto); setSelectedTx(saleTx); setCryptoTxTipo(saleTx.tipo); setCryptoTxData(saleTx.data); setCryptoTxQtd(saleTx.quantidade); setCryptoTxPreco(saleTx.precoUnitario); setCryptoTxTaxas(saleTx.taxas); setCryptoTxLoteOrigemId(""); setActiveModal("crypto-tx-edit"); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteCryptoTx(saleTx.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── ABA 5: APOSTAS / BANCAS ───────────────────────────────────────────── */}
      {currentTab === "apostas" && (
        <section className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Gestão de Bancas & Apostas</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Controle de caixa por plataforma: (Saldo Atual + Sacado) - Depósitos.</p>
            </div>
            <button
              onClick={() => {
                setBetPlataforma(""); setBetSaldoBruto(""); setBetDepositoInicial("");
                setSelectedBet(null);
                setActiveModal("bet-create");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-extrabold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Plataforma
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-[28px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase bg-slate-50/50">
                    <th className="p-4">Plataforma</th>
                    <th className="p-4 text-right">Total Depositado</th>
                    <th className="p-4 text-right">Total Sacado</th>
                    <th className="p-4 text-right">Saldo em Banca</th>
                    <th className="p-4 text-right">Lucro Real</th>
                    <th className="p-4 text-center whitespace-nowrap min-w-[160px]">Ações &amp; Histórico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {apostasData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma banca cadastrada.</td>
                    </tr>
                  ) : (
                    apostasData.map(b => {
                      const isExpanded = expandedBetIds.includes(b.id);
                      const movsOrdenadas = [...b.movimentacoes].sort(
                        (a, x) => new Date(a.data).getTime() - new Date(x.data).getTime()
                      );

                      return (
                        <React.Fragment key={b.id}>
                          {/* LINHA PRINCIPAL DA PLATAFORMA */}
                          <tr
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isExpanded ? "bg-purple-50/20" : ""}`}
                            onClick={() => toggleBetExpand(b.id)}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={e => { e.stopPropagation(); toggleBetExpand(b.id); }} className="p-1 text-slate-400 hover:text-purple-600 rounded-lg">
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                <div>
                                  <p className="font-extrabold text-slate-900">{b.nomePlataforma}</p>
                                  <span className="text-[10px] text-slate-400 font-medium">{b.movimentacoes.length} movimentação(ões)</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-right font-medium text-slate-700">{brl(b.totalDepositado)}</td>
                            <td className="p-4 text-right text-emerald-600 font-bold">+{brl(b.totalSacado)}</td>
                            <td className="p-4 text-right font-black text-slate-900">{brl(b.saldoAtualBruto)}</td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <strong className={`font-black text-sm whitespace-nowrap ${b.lucroReal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {b.lucroReal >= 0 ? "+" : ""}{brl(b.lucroReal)}
                              </strong>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap min-w-[160px]" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-[10px] flex-nowrap whitespace-nowrap">
                                <button onClick={() => toggleBetExpand(b.id)} title="Ver Histórico" className={`p-1.5 rounded-lg flex items-center gap-1 ${isExpanded ? "bg-purple-100 text-purple-700 font-bold" : "text-slate-400 hover:text-purple-600"}`}>
                                  <History className="w-4 h-4" /><span className="text-[10px] font-extrabold">{b.movimentacoes.length}</span>
                                </button>
                                <button onClick={() => { setSelectedBet(b); setBetTxTipo("DEPOSITO"); setBetTxValor(""); setBetTxData(new Date().toISOString().split("T")[0]); setBetTxAtualizarSaldo(true); setActiveModal("bet-tx"); }} title="Lançar Depósito ou Saque" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                  <ArrowRightLeft className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setSelectedBet(b); setBetSaldoBruto(b.saldoAtualBruto); setActiveModal("bet-edit"); }} title="Atualizar Saldo" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setSelectedBet(b); setActiveModal("bet-delete"); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* SUBMENU EXPANDIDO — HISTÓRICO DE MOVIMENTAÇÕES */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="p-0 bg-slate-50/80 border-b border-slate-200/60">
                                <div className="p-5 flex flex-col gap-4 bg-purple-50/30 border-l-4 border-l-purple-500 rounded-b-2xl shadow-inner my-1 mx-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-2"><History className="w-4 h-4 text-purple-600" />Histórico de Movimentações ({b.nomePlataforma})</h4>
                                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Depósitos e saques com saldo parcial calculado cronologicamente.</p>
                                    </div>
                                    <button onClick={() => { setSelectedBet(b); setBetTxTipo("DEPOSITO"); setBetTxValor(""); setBetTxData(new Date().toISOString().split("T")[0]); setBetTxAtualizarSaldo(true); setActiveModal("bet-tx"); }} className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                                      <Plus className="w-3.5 h-3.5" /> Nova Movimentação
                                    </button>
                                  </div>

                                  {movsOrdenadas.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">Nenhuma movimentação registrada.</p>
                                  ) : (
                                    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                                      <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                          <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase">
                                            <th className="p-3">ID / Data</th>
                                            <th className="p-3 text-center">Tipo</th>
                                            <th className="p-3 text-right">Valor (R$)</th>
                                            <th className="p-3 text-right">Saldo Parcial</th>
                                            <th className="p-3 text-center whitespace-nowrap min-w-[100px]">Ações</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                          {(() => {
                                            let saldoAcumulado = 0;
                                            return movsOrdenadas.map((mov, idx) => {
                                              if (mov.tipo === "DEPOSITO") saldoAcumulado += mov.valor;
                                              else saldoAcumulado -= mov.valor;
                                              return (
                                                <tr key={mov.id} className={`hover:bg-slate-50/70 transition-colors ${mov.tipo === "DEPOSITO" ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-rose-400"}`}>
                                                  <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg ${mov.tipo === "DEPOSITO" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                                                        Mov #{idx + 1}
                                                      </span>
                                                      <span className="text-slate-600 font-semibold">{formatDateDisplay(mov.data)}</span>
                                                    </div>
                                                  </td>
                                                  <td className="p-3 text-center">
                                                    <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-md uppercase ${mov.tipo === "DEPOSITO" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-rose-100 text-rose-800 border border-rose-200"}`}>
                                                      {mov.tipo === "DEPOSITO" ? "Depósito" : "Saque"}
                                                    </span>
                                                  </td>
                                                  <td className="p-3 text-right">
                                                    <span className={`font-black ${mov.tipo === "DEPOSITO" ? "text-emerald-700" : "text-rose-700"}`}>
                                                      {mov.tipo === "DEPOSITO" ? "+" : "-"}{brl(mov.valor)}
                                                    </span>
                                                  </td>
                                                  <td className="p-3 text-right">
                                                    <span className={`font-bold ${saldoAcumulado >= 0 ? "text-slate-700" : "text-rose-600"}`}>{brl(saldoAcumulado)}</span>
                                                  </td>
                                                  <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                      <button
                                                        onClick={() => { setSelectedBetTx(mov); setBetTxEditTipo(mov.tipo); setBetTxEditValor(mov.valor); setBetTxEditData(mov.data); setActiveModal("bet-tx-edit" as any); }}
                                                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                                        title="Editar movimentação"
                                                      ><Pencil className="w-3.5 h-3.5" /></button>
                                                      <button
                                                        onClick={() => handleDeleteBetTx(mov.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                        title="Excluir movimentação"
                                                      ><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            });
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* Resumo de caixa */}
                                  <div className="grid grid-cols-3 gap-3 pt-1">
                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase">Total Depositado</span>
                                      <span className="text-sm font-black text-slate-900">{brl(b.totalDepositado)}</span>
                                    </div>
                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase">Total Sacado</span>
                                      <span className="text-sm font-black text-emerald-600">+{brl(b.totalSacado)}</span>
                                    </div>
                                    <div className={`border rounded-2xl p-3 flex flex-col gap-1 ${b.lucroReal >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                                      <span className="text-[10px] font-black text-slate-400 uppercase">Lucro Real</span>
                                      <span className={`text-sm font-black ${b.lucroReal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{b.lucroReal >= 0 ? "+" : ""}{brl(b.lucroReal)}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}

                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── MODAIS DINÂMICOS DA PÁGINA ────────────────────────────────────────── */}

      {/* Modal Renda Fixa (Criar / Editar) */}
      {(activeModal === "rf-create" || activeModal === "rf-edit") && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{activeModal === "rf-create" ? "Novo Investimento - Renda Fixa" : "Editar Renda Fixa"}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Preencha os dados do título.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveRf} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Título *</label>
                <input required type="text" value={rfTitulo} onChange={e => setRfTitulo(e.target.value)} placeholder="Ex: CDB Banco Master 120%" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo *</label>
                  <select value={rfCategoria} onChange={e => setRfCategoria(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                    <option value="CDB">CDB</option><option value="Tesouro">Tesouro Direto</option><option value="LCI">LCI</option><option value="LCA">LCA</option><option value="CRI">CRI / CRA</option><option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data Inicial *</label>
                  <input required type="date" value={rfDataInicial} onChange={e => setRfDataInicial(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 text-slate-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Investido (R$) *</label>
                  <input required type="number" step="0.01" min="0" value={rfValorInvestido} onChange={e => setRfValorInvestido(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bruto Atual (R$) *</label>
                  <input required type="number" step="0.01" min="0" value={rfValorBruto} onChange={e => setRfValorBruto(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Imposto Estimado (R$)</label>
                  <input type="number" step="0.01" min="0" value={rfImposto} onChange={e => setRfImposto(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxas Acumuladas (R$)</label>
                  <input type="number" step="0.01" min="0" value={rfTaxas} onChange={e => setRfTaxas(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/25">SALVAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Renda Variável (Novo Ciclo) */}
      {activeModal === "rv-create" && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Novo Ativo / Ciclo - Renda Variável</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Selecione ou digite um ticker para lançar um novo ciclo ou lote.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleSaveRvAsset} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Código / Ticker *</label>
                  <input list="tickers-list" required type="text" value={rvTitulo} onChange={e => setRvTitulo(e.target.value.toUpperCase())} placeholder="Ex: PETR4" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" />
                  <datalist id="tickers-list">{existingTickers.map(t => <option key={t} value={t} />)}</datalist>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Categoria *</label>
                  <select value={rvCategoria} onChange={e => setRvCategoria(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-900"><option value="Ação">Ação</option><option value="FII">FII</option><option value="ETF">ETF</option><option value="BDR">BDR</option></select>
                </div>
              </div>

              {existingOpenCycle && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex flex-col gap-2">
                  <p className="text-[11px] font-extrabold text-blue-900 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-blue-600" />Já existe um ciclo ativo para {rvTitulo.trim().toUpperCase()}!</p>
                  <div className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="destino-mode" value="NOVO_CICLO" checked={rvDestinoMode === "NOVO_CICLO"} onChange={() => setRvDestinoMode("NOVO_CICLO")} /><span>Criar um <strong>Novo Ciclo</strong></span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="destino-mode" value="ADICIONAR_EXISTENTE" checked={rvDestinoMode === "ADICIONAR_EXISTENTE"} onChange={() => setRvDestinoMode("ADICIONAR_EXISTENTE")} /><span>Adicionar ao <strong>Ciclo Ativo Existente</strong></span></label>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cotação Atual de Mercado (R$) *</label>
                <input required type="number" step="0.01" min="0.01" value={rvCotacaoAtual} onChange={e => setRvCotacaoAtual(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Primeiro Aporte / Lote do Ciclo *</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><label className="text-[10px] font-semibold text-slate-500">Qtd. Cotas *</label><input required type="number" min="1" value={rvQtdInicial} onChange={e => setRvQtdInicial(e.target.value === "" ? "" : Number(e.target.value))} placeholder="100" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-900" /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-[10px] font-semibold text-slate-500">Preço Pago / Cota (R$) *</label><input required type="number" step="0.01" min="0.01" value={rvPrecoInicial} onChange={e => setRvPrecoInicial(e.target.value === "" ? "" : Number(e.target.value))} placeholder="30,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-900" /></div>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/25">SALVAR OPERAÇÃO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ordem RV (Transação) */}
      {(activeModal === "rv-tx" || activeModal === "rv-tx-edit") && selectedRv && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{activeModal === "rv-tx-edit" ? `Editar Ordem em ${selectedRv.titulo}` : `Lançar Ordem de COMPRA / VENDA`}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">As vendas abatem os lotes do ciclo de forma direcionada ou via FIFO.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveRvTx} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ciclo / Contrato de Origem *</label>
                <select value={selectedRv.id} onChange={e => { const found = rendaVariavelData.find(a => a.id === e.target.value); if (found) { setSelectedRv(found); setRvTxPreco(found.cotacaoAtual); setRvTxLoteOrigemId(""); } }} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-900">
                  {rendaVariavelData.filter(a => a.status === "ABERTO").map(a => <option key={a.id} value={a.id}>{a.titulo} ({a.categoria}) — {a.quantidadeCotas} cotas abertas (PM: {brl(a.precoMedio)})</option>)}
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Cotas disponíveis neste ciclo:</span>
                <span className="font-black text-slate-900">{selectedRv.quantidadeCotas} cotas</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo da Ordem *</label><select value={rvTxTipo} onChange={e => setRvTxTipo(e.target.value as any)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-bold text-slate-900"><option value="COMPRA">COMPRA (Aporte)</option><option value="VENDA">VENDA (Abate)</option></select></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data da Ordem *</label><input required type="date" value={rvTxData} onChange={e => setRvTxData(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-900" /></div>
              </div>

              {rvTxTipo === "VENDA" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vincular ao Lote de Origem *</label>
                  <select value={rvTxLoteOrigemId} onChange={e => setRvTxLoteOrigemId(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-900">
                    <option value="">🎯 Baixa Automática por FIFO (Ordem Cronológica)</option>
                    {selectedRv.lotesAbertos?.map(lot => <option key={lot.id} value={lot.id}>🏷️ Lote #{lot.loteNumero} — {formatDateDisplay(lot.data)} ({lot.quantidadeRestante} cotas disp. @ {brl(lot.custoUnitarioComTaxas)})</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Qtd. Cotas *</label><input required type="number" min="1" max={rvTxTipo === "VENDA" ? selectedRv.quantidadeCotas : undefined} value={rvTxQtd} onChange={e => setRvTxQtd(e.target.value === "" ? "" : Number(e.target.value))} placeholder="50" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Preço Unitário (R$) *</label><input required type="number" step="0.01" min="0.01" value={rvTxPreco} onChange={e => setRvTxPreco(e.target.value === "" ? "" : Number(e.target.value))} placeholder="34,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" /></div>
              </div>

              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxas / Corretagem (R$)</label><input type="number" step="0.01" min="0" value={rvTxTaxas} onChange={e => setRvTxTaxas(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-900" /></div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/25">REGISTRAR ORDEM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal EDITAR TODOS OS CAMPOS DO CICLO / ATIVO (Ações & FIIs) */}
      {activeModal === "rv-edit-asset" && selectedRv && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Editar Ciclo de {selectedRv.titulo}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Edite os dados principais, cotação, proventos ou status.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUpdateFullRvAsset} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Código / Ticker *</label>
                  <input required type="text" value={rvTitulo} onChange={e => setRvTitulo(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Categoria *</label>
                  <select value={rvCategoria} onChange={e => setRvCategoria(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                    <option value="Ação">Ação</option><option value="FII">FII (Fundo Imobiliário)</option><option value="ETF">ETF</option><option value="BDR">BDR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cotação Atual (R$) *</label>
                  <input required type="number" step="0.01" min="0.01" value={rvCotacaoAtual} onChange={e => setRvCotacaoAtual(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Proventos / Dividendos (R$)</label>
                  <input type="number" step="0.01" min="0" value={rvDividendos} onChange={e => setRvDividendos(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status do Ciclo *</label>
                <select value={rvStatus} onChange={e => setRvStatus(e.target.value as any)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="ABERTO">ABERTO (Operação em andamento)</option>
                  <option value="ENCERRADO">ENCERRADO (Posição zerada / resgatada)</option>
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/25">SALVAR ALTERAÇÕES</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Novo Ciclo CRIPTO (Grid 2 colunas limpo) */}
      {activeModal === "crypto-create" && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Novo Ativo / Ciclo Cripto</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Selecione ou digite um token para lançar um novo ciclo ou lote.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveCryptoAsset} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Token (Ticker) *</label>
                  <input
                    list="crypto-tokens-list"
                    required
                    type="text"
                    value={cryptoToken}
                    onChange={e => setCryptoToken(e.target.value.toUpperCase())}
                    placeholder="Ex: BTC, ETH"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <datalist id="crypto-tokens-list">
                    {existingCryptoTokens.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome da Cripto *</label>
                  <input
                    required
                    type="text"
                    value={cryptoNome}
                    onChange={e => setCryptoNome(e.target.value)}
                    placeholder="Ex: Bitcoin"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              {existingCryptoOpenCycle && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col gap-2">
                  <p className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-600" />Já existe um ciclo ativo para {cryptoToken.trim().toUpperCase()}!</p>
                  <div className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="crypto-destino-mode" value="NOVO_CICLO" checked={cryptoDestinoMode === "NOVO_CICLO"} onChange={() => setCryptoDestinoMode("NOVO_CICLO")} /><span>Criar um <strong>Novo Ciclo</strong></span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="crypto-destino-mode" value="ADICIONAR_EXISTENTE" checked={cryptoDestinoMode === "ADICIONAR_EXISTENTE"} onChange={() => setCryptoDestinoMode("ADICIONAR_EXISTENTE")} /><span>Adicionar ao <strong>Ciclo Ativo Existente</strong></span></label>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cotação Atual de Mercado (R$) *</label>
                <input required type="number" step="0.01" min="0.01" value={cryptoCotacao} onChange={e => setCryptoCotacao(e.target.value === "" ? "" : Number(e.target.value))} placeholder="340000,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200" />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Primeiro Aporte / Lote do Ciclo Cripto *</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500">Qtd. Moedas *</label>
                    <input required type="number" step="any" min="0" value={cryptoQtdInicial} onChange={e => setCryptoQtdInicial(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.05" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-900" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500">Preço Pago / Moeda (R$) *</label>
                    <input required type="number" step="0.01" min="0.01" value={cryptoPrecoInicial} onChange={e => setCryptoPrecoInicial(e.target.value === "" ? "" : Number(e.target.value))} placeholder="300000,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-900" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-2xl shadow-lg shadow-amber-600/25">SALVAR OPERAÇÃO CRIPTO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ordem Cripto (Transação COMPRA / VENDA com Seleção do Lote Origem) */}
      {(activeModal === "crypto-tx" || activeModal === "crypto-tx-edit") && selectedCrypto && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{activeModal === "crypto-tx-edit" ? `Editar Ordem em ${selectedCrypto.token}` : `Lançar Ordem de COMPRA / VENDA (${selectedCrypto.token})`}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">As vendas abatem os lotes do ciclo de forma direcionada ou via FIFO.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveCryptoTx} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ciclo / Contrato de Origem *</label>
                <select value={selectedCrypto.id} onChange={e => { const found = criptoData.find(c => c.id === e.target.value); if (found) { setSelectedCrypto(found); setCryptoTxPreco(found.cotacaoAtual); setCryptoTxLoteOrigemId(""); } }} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-900">
                  {criptoData.filter(c => c.status === "ABERTO").map(c => <option key={c.id} value={c.id}>{c.token} ({c.nome}) — {c.quantidadeMoedas} moedas abertas (PM: {brl(c.precoMedio)})</option>)}
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Moedas disponíveis neste ciclo:</span>
                <span className="font-black text-slate-900">{selectedCrypto.quantidadeMoedas} moedas</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo da Ordem *</label><select value={cryptoTxTipo} onChange={e => setCryptoTxTipo(e.target.value as any)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-bold text-slate-900"><option value="COMPRA">COMPRA (Aporte)</option><option value="VENDA">VENDA (Abate)</option></select></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data da Ordem *</label><input required type="date" value={cryptoTxData} onChange={e => setCryptoTxData(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-900" /></div>
              </div>

              {cryptoTxTipo === "VENDA" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vincular ao Lote de Origem *</label>
                  <select value={cryptoTxLoteOrigemId} onChange={e => setCryptoTxLoteOrigemId(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-900">
                    <option value="">🎯 Baixa Automática por FIFO (Ordem Cronológica)</option>
                    {selectedCrypto.lotesAbertos?.map(lot => <option key={lot.id} value={lot.id}>🏷️ Lote #{lot.loteNumero} — {formatDateDisplay(lot.data)} ({lot.quantidadeRestante} moedas disp. @ {brl(lot.custoUnitarioComTaxas)})</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Qtd. Moedas *</label><input required type="number" step="any" min="0" max={cryptoTxTipo === "VENDA" ? selectedCrypto.quantidadeMoedas : undefined} value={cryptoTxQtd} onChange={e => setCryptoTxQtd(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.05" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Preço Unitário (R$) *</label><input required type="number" step="0.01" min="0.01" value={cryptoTxPreco} onChange={e => setCryptoTxPreco(e.target.value === "" ? "" : Number(e.target.value))} placeholder="340000,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" /></div>
              </div>

              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxas / Corretagem (R$)</label><input type="number" step="0.01" min="0" value={cryptoTxTaxas} onChange={e => setCryptoTxTaxas(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-900" /></div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-2xl shadow-lg shadow-amber-600/25">REGISTRAR ORDEM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Todos os Campos do Ciclo Cripto */}
      {activeModal === "crypto-edit-asset" && selectedCrypto && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Editar Ciclo Cripto ({selectedCrypto.token})</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Edite os dados. Qtd e Custo Total ajustam o lote de origem para recalcular o Preço Médio.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUpdateFullCryptoAsset} className="flex flex-col gap-4">
              {/* Token + Nome */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Token / Ticker *</label>
                  <input required type="text" value={cryptoToken} onChange={e => setCryptoToken(e.target.value.toUpperCase())} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome da Cripto *</label>
                  <input required type="text" value={cryptoNome} onChange={e => setCryptoNome(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                </div>
              </div>

              {/* Qtd Moedas + Custo Total (ajuste manual do lote) */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2.5">Posição Atual do Ciclo (Ajuste Manual)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Qtd. de Moedas *</label>
                    <input
                      required
                      type="number"
                      step="any"
                      min="0"
                      value={cryptoQtdEdit}
                      onChange={e => setCryptoQtdEdit(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Custo Total Investido (R$) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={cryptoCustoTotalEdit}
                      onChange={e => setCryptoCustoTotalEdit(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>
                {/* Preço Médio Preview */}
                {cryptoQtdEdit !== "" && cryptoCustoTotalEdit !== "" && Number(cryptoQtdEdit) > 0 && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-800">Preço Médio Calculado:</span>
                    <span className="font-black text-amber-900">{brl(Number(cryptoCustoTotalEdit) / Number(cryptoQtdEdit))}</span>
                  </div>
                )}
              </div>

              {/* Cotação Atual */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cotação Atual de Mercado (R$) *</label>
                <input required type="number" step="0.01" min="0.01" value={cryptoCotacao} onChange={e => setCryptoCotacao(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200" />
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status do Ciclo *</label>
                <select value={cryptoStatus} onChange={e => setCryptoStatus(e.target.value as any)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200">
                  <option value="ABERTO">ABERTO (Posição em Carteira)</option>
                  <option value="ENCERRADO">ENCERRADO (Posição Zerada)</option>
                </select>
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/25">SALVAR ALTERAÇÕES</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Movimentação de Banca (bet-tx-edit) */}
      {activeModal === "bet-tx-edit" && selectedBetTx && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Editar Movimentação</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Corrija o tipo, valor ou data desta movimentação.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveBetTxEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo *</label>
                <select value={betTxEditTipo} onChange={e => setBetTxEditTipo(e.target.value as any)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200">
                  <option value="DEPOSITO">DEPÓSITO (Entrada na Banca)</option>
                  <option value="SAQUE">SAQUE (Retirada da Banca)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor (R$) *</label>
                  <input required type="number" step="0.01" min="0.01" value={betTxEditValor} onChange={e => setBetTxEditValor(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data *</label>
                  <input required type="date" value={betTxEditData} onChange={e => setBetTxEditData(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-200" />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl shadow-lg shadow-purple-600/25">SALVAR ALTERAÇÕES</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Plataforma / Banca */}
      {activeModal === "bet-create" && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div><h3 className="text-sm font-black text-slate-900">Nova Banca / Plataforma</h3><p className="text-[10px] font-semibold text-slate-400 mt-0.5">Cadastre a plataforma para gestão de depósitos vs saques.</p></div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveBetAccount} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome da Plataforma *</label><input required type="text" value={betPlataforma} onChange={e => setBetPlataforma(e.target.value)} placeholder="Ex: Betano" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" /></div>
              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo Atual na Banca (R$) *</label><input required type="number" step="0.01" min="0" value={betSaldoBruto} onChange={e => setBetSaldoBruto(e.target.value === "" ? "" : Number(e.target.value))} placeholder="450,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" /></div>
              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Depósito Inicial (R$)</label><input type="number" step="0.01" min="0" value={betDepositoInicial} onChange={e => setBetDepositoInicial(e.target.value === "" ? "" : Number(e.target.value))} placeholder="100,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-900" /></div>
              <div className="flex gap-2 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button><button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl shadow-lg shadow-purple-600/25">CRIAR BANCA</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lançar Depósito / Saque de Banca */}
      {activeModal === "bet-tx" && selectedBet && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div><h3 className="text-sm font-black text-slate-900">Movimentação em {selectedBet.nomePlataforma}</h3><p className="text-[10px] font-semibold text-slate-400 mt-0.5">Depósito ou Saque com cálculo de Lucro Real.</p></div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveBetTx} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo *</label><select value={betTxTipo} onChange={e => setBetTxTipo(e.target.value as any)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-bold text-slate-900"><option value="DEPOSITO">DEPÓSITO</option><option value="SAQUE">SAQUE</option></select></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data *</label><input required type="date" value={betTxData} onChange={e => setBetTxData(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-900" /></div>
              </div>
              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor (R$) *</label><input required type="number" step="0.01" min="0.01" value={betTxValor} onChange={e => setBetTxValor(e.target.value === "" ? "" : Number(e.target.value))} placeholder="150,00" className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" /></div>
              <div className="flex items-center gap-2 pt-1"><input type="checkbox" id="bet-update-saldo" checked={betTxAtualizarSaldo} onChange={e => setBetTxAtualizarSaldo(e.target.checked)} className="rounded text-purple-600" /><label htmlFor="bet-update-saldo" className="text-xs font-semibold text-slate-700">Atualizar Saldo da Banca automaticamente</label></div>
              <div className="flex gap-2 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button><button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl shadow-lg shadow-purple-600/25">REGISTRAR</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Saldo Banca */}
      {activeModal === "bet-edit" && selectedBet && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div><h3 className="text-sm font-black text-slate-900">Atualizar Saldo em {selectedBet.nomePlataforma}</h3><p className="text-[10px] font-semibold text-slate-400 mt-0.5">Redefine o saldo atual disponível na banca.</p></div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUpdateBetSaldo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Novo Saldo Atual (R$) *</label><input required type="number" step="0.01" min="0" value={betSaldoBruto} onChange={e => setBetSaldoBruto(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900" /></div>
              <div className="flex gap-2 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">CANCELAR</button><button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl shadow-lg shadow-purple-600/25">ATUALIZAR SALDO</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modais Excluir (RV, Cripto, Bet) */}
      {activeModal === "rv-delete" && selectedRv && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-black text-slate-900">Excluir Ciclo de {selectedRv.titulo}</h3>
            <p className="text-xs font-semibold text-slate-500">Tem certeza que deseja excluir este contrato/ciclo de operação?</p>
            <div className="flex gap-2 mt-2"><button onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button><button onClick={handleDeleteRv} disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl">EXCLUIR</button></div>
          </div>
        </div>
      )}

      {activeModal === "crypto-delete" && selectedCrypto && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-black text-slate-900">Excluir Ciclo Cripto ({selectedCrypto.token})</h3>
            <p className="text-xs font-semibold text-slate-500">Tem certeza que deseja remover este ciclo cripto?</p>
            <div className="flex gap-2 mt-2"><button onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">CANCELAR</button><button onClick={handleDeleteCrypto} disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl">EXCLUIR</button></div>
          </div>
        </div>
      )}

      {/* ── ABA 6: OUTROS INVESTIMENTOS ────────────────────────────────────────── */}
      {currentTab === "outros" && (
        <section className="space-y-6 animate-in fade-in">
          
          {/* Top Bar / Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-600" />
                Outros Investimentos
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Gestão livre de investimentos diversos (startups, empréstimos, ativos alternativos, etc.).
              </p>
            </div>
            <button
              onClick={openCreateOutroModal}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-teal-600/20 font-extrabold text-xs tracking-wider flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              + NOVO REGISTRO
            </button>
          </div>

          {/* Cards de Resumo */}
          {(() => {
            let totalInvestido = 0;
            let totalSaque = 0;
            let totalTaxas = 0;
            let lucroReal = 0;

            outrosData.forEach(item => {
              totalInvestido += item.totalInvestido;
              totalSaque += item.totalSaque;
              totalTaxas += item.taxaImposto;
              lucroReal += item.lucroReal;
            });

            const lucroPct = totalInvestido > 0 ? (lucroReal / totalInvestido) * 100 : 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Investido</span>
                  <p className="text-2xl font-black text-slate-900 mt-1 font-tnum tabular-nums">{brl(totalInvestido)}</p>
                  <span className="text-xs font-medium text-slate-500 mt-1 block">{outrosData.length} registro(s) cadastrado(s)</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total de Saques</span>
                  <p className="text-2xl font-black text-teal-600 mt-1 font-tnum tabular-nums">{brl(totalSaque)}</p>
                  <span className="text-xs font-medium text-slate-500 mt-1 block">Retorno bruto obtido</span>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lucro Real ($ / %)</span>
                  <p className={`text-2xl font-black mt-1 font-tnum tabular-nums ${lucroReal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {lucroReal >= 0 ? "+" : ""}{brl(lucroReal)}
                  </p>
                  <span className={`text-xs font-extrabold mt-1 block ${lucroPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {lucroPct >= 0 ? "+" : ""}{lucroPct.toFixed(2)}% de retorno
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Tabela de Outros Investimentos */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col gap-4">
            {outrosData.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
                <Briefcase className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Nenhum investimento registrado</p>
                <p className="text-xs font-medium text-slate-400 max-w-sm">
                  Clique no botão "+ NOVO REGISTRO" acima para adicionar ativos ou aportes nesta categoria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/60">
                      <th className="px-4 py-3.5">Data</th>
                      <th className="px-4 py-3.5">Nome do Investimento</th>
                      <th className="px-4 py-3.5 text-right">Total Investido</th>
                      <th className="px-4 py-3.5 text-right">Taxa / Imposto</th>
                      <th className="px-4 py-3.5 text-right">Total de Saque</th>
                      <th className="px-4 py-3.5 text-right font-black">Lucro Real $</th>
                      <th className="px-4 py-3.5 text-right font-black">Lucro %</th>
                      <th className="px-4 py-3.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900">
                    {outrosData.map((item) => {
                      const hasSaque = item.totalSaque > 0;
                      const lucroPositivo = item.lucroReal >= 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                            {item.data ? formatDateDisplay(item.data) : "-"}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {item.nome}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums font-tnum text-slate-900">
                            {brl(item.totalInvestido)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums font-tnum text-amber-700">
                            {brl(item.taxaImposto)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums font-tnum text-teal-600">
                            {brl(item.totalSaque)}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-bold tabular-nums font-tnum ${!hasSaque ? "text-slate-500 font-normal" : lucroPositivo ? "text-emerald-600" : "text-rose-600"}`}>
                            {!hasSaque ? "R$ 0,00" : `${lucroPositivo ? "+" : ""}${brl(item.lucroReal)}`}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold tabular-nums font-tnum">
                            {!hasSaque ? (
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 border border-slate-200/80 font-bold uppercase tracking-wider">
                                Em andamento
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${lucroPositivo ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"}`}>
                                {lucroPositivo ? "+" : ""}{item.lucroPorcentagem.toFixed(2)}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEditOutroModal(item)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Editar Investimento"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setSelectedOutro(item); setActiveModal("outro-delete"); }}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                title="Excluir Investimento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal Criar/Editar Outros Investimentos */}
      {(activeModal === "outro-create" || (activeModal === "outro-edit" && selectedOutro)) && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-md flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {activeModal === "outro-create" ? "Novo Registro - Outros Investimentos" : `Editar Investimento (${selectedOutro?.nome})`}
                </h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  Preencha os campos abaixo. Nenhum campo é obrigatório.
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOutro} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome do Investimento</label>
                <input
                  type="text"
                  value={outroNome}
                  onChange={e => setOutroNome(e.target.value)}
                  placeholder="Ex: Startup Alpha / Empréstimo P2P"
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data</label>
                  <input
                    type="date"
                    value={outroData}
                    onChange={e => setOutroData(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Investido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={outroTotalInvestido}
                    onChange={e => setOutroTotalInvestido(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taxa ou Imposto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={outroTaxaImposto}
                    onChange={e => setOutroTaxaImposto(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total de Saque (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={outroTotalSaque}
                    onChange={e => setOutroTotalSaque(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              </div>

              {/* Preview de Lucro Real */}
              {(() => {
                const inv = outroTotalInvestido === "" ? 0 : Number(outroTotalInvestido);
                const tax = outroTaxaImposto === "" ? 0 : Number(outroTaxaImposto);
                const saq = outroTotalSaque === "" ? 0 : Number(outroTotalSaque);
                const hasSaqueVal = saq > 0;
                const lucro = hasSaqueVal ? (saq - inv - tax) : 0;
                const pct = (hasSaqueVal && inv > 0) ? (lucro / inv) * 100 : 0;
                return (
                  <div className="p-3 bg-teal-50 border border-teal-200/80 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-800">Lucro Real Estimado:</span>
                    {!hasSaqueVal ? (
                      <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 uppercase text-[10px]">
                        Em andamento (aguardando resgate/saque)
                      </span>
                    ) : (
                      <span className={`font-black ${lucro >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {brl(lucro)} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">
                  CANCELAR
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-teal-600 hover:bg-teal-700 rounded-2xl shadow-lg shadow-teal-600/25">
                  {activeModal === "outro-create" ? "CRIAR REGISTRO" : "SALVAR ALTERAÇÕES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Outros Investimentos */}
      {activeModal === "outro-delete" && selectedOutro && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-7 w-full max-w-sm flex flex-col gap-5 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-black text-slate-900">Excluir Investimento</h3>
            <p className="text-xs font-semibold text-slate-500">Tem certeza que deseja excluir <strong>{selectedOutro.nome}</strong>?</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-3 text-xs font-extrabold text-slate-500 bg-slate-100 rounded-2xl">
                CANCELAR
              </button>
              <button onClick={handleDeleteOutro} disabled={saving} className="flex-1 py-3 text-xs font-extrabold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl">
                EXCLUIR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
