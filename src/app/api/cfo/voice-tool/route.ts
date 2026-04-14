import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { appEnv } from "@/server/recovery/config";
import { getCfoAgentService } from "@/server/recovery/services/cfo-agent-service";
import { timingSafeEqual } from "node:crypto";

/**
 * ElevenLabs Conversational AI webhook tool endpoint.
 * Called by the voice agent when it needs financial data.
 *
 * ElevenLabs sends: { "metrica": "resumo_diario", ... }
 * Plus headers with the shared secret for auth.
 */

type MetricaType =
  | "resumo_diario"
  | "fluxo_caixa"
  | "inadimplencia"
  | "performance_canais"
  | "previsao_semana"
  | "acoes_urgentes"
  | "comparacao_mensal"
  | "snapshot_completo";

function verifySecret(req: NextRequest): boolean {
  const secret = appEnv.elevenLabsToolSecret;
  if (!secret) return false;

  // ElevenLabs sends the secret in the authorization header
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");

  if (token.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify ElevenLabs webhook secret
    if (!verifySecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const metrica = (body.metrica || body.metric || "snapshot_completo") as MetricaType;
    const sellerKey = body.seller_key || "";

    const service = getCfoAgentService();

    // Scope data to seller when seller_key is provided via ElevenLabs dynamic variable
    const ctx = sellerKey ? { email: "", role: "seller", sellerAgentName: sellerKey, sellerKey } : undefined;
    const snapshot = await service.getFinancialSnapshot(ctx);

    switch (metrica) {
      case "resumo_diario":
        return NextResponse.json({
          resumo: {
            pagamentos_recuperados: snapshot.recovery.recovered,
            total_falhas: snapshot.recovery.totalFailed,
            taxa_recuperacao: `${snapshot.recovery.recoveryRate.toFixed(1)}%`,
            receita_recuperada: `R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)}`,
            recuperacoes_ativas: snapshot.recovery.activeRecoveries,
            tempo_medio_recuperacao: `${snapshot.recovery.avgRecoveryTimeHours.toFixed(1)} horas`,
            leads_ativos: snapshot.activeLeads,
            contatos_whatsapp: snapshot.channels.whatsapp,
            contatos_email: snapshot.channels.email,
            ligacoes: snapshot.channels.voice,
          },
        });

      case "fluxo_caixa":
        return NextResponse.json({
          fluxo_caixa: {
            receita_recuperada: `R$ ${(snapshot.cashFlow.inbound / 100).toFixed(2)}`,
            valor_liquido: `R$ ${(snapshot.cashFlow.net / 100).toFixed(2)}`,
            projecao_7_dias: `R$ ${(snapshot.cashFlow.projectedWeek / 100).toFixed(2)}`,
            valor_em_risco: `R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)}`,
            status: snapshot.cashFlow.net > 0 ? "positivo" : "atencao",
          },
        });

      case "inadimplencia":
        return NextResponse.json({
          inadimplencia: {
            total_leads: snapshot.delinquency.total,
            valor_total: `R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)}`,
            por_faixa: {
              "0_a_7_dias": snapshot.delinquency.byAge["0-7d"] || 0,
              "8_a_15_dias": snapshot.delinquency.byAge["8-15d"] || 0,
              "16_a_30_dias": snapshot.delinquency.byAge["16-30d"] || 0,
              "mais_de_30_dias": snapshot.delinquency.byAge["30d+"] || 0,
            },
          },
        });

      case "performance_canais": {
        const total = snapshot.channels.whatsapp + snapshot.channels.email + snapshot.channels.voice + snapshot.channels.sms;
        return NextResponse.json({
          canais: {
            whatsapp: { contatos: snapshot.channels.whatsapp, percentual: total > 0 ? `${Math.round(snapshot.channels.whatsapp / total * 100)}%` : "0%" },
            email: { contatos: snapshot.channels.email, percentual: total > 0 ? `${Math.round(snapshot.channels.email / total * 100)}%` : "0%" },
            voz: { contatos: snapshot.channels.voice, percentual: total > 0 ? `${Math.round(snapshot.channels.voice / total * 100)}%` : "0%" },
            sms: { contatos: snapshot.channels.sms, percentual: total > 0 ? `${Math.round(snapshot.channels.sms / total * 100)}%` : "0%" },
            total_pontos_contato: total,
          },
        });
      }

      case "previsao_semana":
        return NextResponse.json({
          previsao: {
            receita_projetada: `R$ ${(snapshot.cashFlow.projectedWeek / 100).toFixed(2)}`,
            leads_em_processo: snapshot.recovery.activeRecoveries,
            leads_recentes_alta_conversao: snapshot.delinquency.byAge["0-7d"] || 0,
            leads_antigos_negativacao: snapshot.delinquency.byAge["30d+"] || 0,
            recomendacao: `Priorizar os ${snapshot.delinquency.byAge["0-7d"] || 0} leads recentes para maximizar taxa de recuperacao`,
          },
        });

      case "acoes_urgentes": {
        const acoes: string[] = [];
        if (snapshot.recovery.activeRecoveries > 0) acoes.push(`${snapshot.recovery.activeRecoveries} leads aguardam acao de recuperacao`);
        if (snapshot.delinquency.byAge["0-7d"]) acoes.push(`${snapshot.delinquency.byAge["0-7d"]} leads novos sem contato — prioridade maxima`);
        if (snapshot.delinquency.byAge["30d+"]) acoes.push(`${snapshot.delinquency.byAge["30d+"]} leads com mais de 30 dias — avaliar negativacao`);
        if (snapshot.channels.voice === 0) acoes.push("Canal de voz sem uso — ativar para leads de alto valor");
        if (acoes.length === 0) acoes.push("Nenhuma acao urgente no momento");
        return NextResponse.json({ acoes_urgentes: acoes });
      }

      case "comparacao_mensal":
        return NextResponse.json({
          comparacao: {
            recuperacoes: snapshot.recovery.recovered,
            receita: `R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)}`,
            taxa: `${snapshot.recovery.recoveryRate.toFixed(1)}%`,
            leads_ativos: snapshot.activeLeads,
            nota: "Dados comparativos com mes anterior serao disponibilizados quando houver historico suficiente",
          },
        });

      case "snapshot_completo":
      default:
        return NextResponse.json({
          snapshot: {
            recuperacao: {
              recuperados: snapshot.recovery.recovered,
              total_falhas: snapshot.recovery.totalFailed,
              taxa: `${snapshot.recovery.recoveryRate.toFixed(1)}%`,
              receita: `R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)}`,
              ativos: snapshot.recovery.activeRecoveries,
              tempo_medio: `${snapshot.recovery.avgRecoveryTimeHours.toFixed(1)}h`,
            },
            leads_ativos: snapshot.activeLeads,
            fluxo_caixa: {
              entrada: `R$ ${(snapshot.cashFlow.inbound / 100).toFixed(2)}`,
              liquido: `R$ ${(snapshot.cashFlow.net / 100).toFixed(2)}`,
              projecao_semana: `R$ ${(snapshot.cashFlow.projectedWeek / 100).toFixed(2)}`,
            },
            inadimplencia: {
              total: snapshot.delinquency.total,
              valor: `R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)}`,
              faixas: snapshot.delinquency.byAge,
            },
            canais: {
              whatsapp: snapshot.channels.whatsapp,
              email: snapshot.channels.email,
              voz: snapshot.channels.voice,
              sms: snapshot.channels.sms,
            },
          },
        });
    }
  } catch (error) {
    console.error("[cfo/voice-tool] Error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados financeiros. Tente novamente." },
      { status: 500 },
    );
  }
}
