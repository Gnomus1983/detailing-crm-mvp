export const planLabels = {
  starter: "Старт",
  pro: "Про",
  studio: "Студия"
};

export const storefrontPlanToCompanyPlan = {
  basic: "starter",
  solo: "pro",
  professional: "studio"
};

export const planSeatLimits = {
  starter: 3,
  pro: 10,
  studio: null
};

export const goLiveBlockerLabels = {
  company_status: "company_inactive",
  owner: "owner_missing",
  members: "team_missing",
  services: "services_missing",
  subscription: "subscription_missing",
  billing: "billing_not_paid",
  renewal: "renewal_blocked",
  handoff: "handoff_open"
};

export function getDaysUntil(value) {
  if (!value) {
    return null;
  }

  const target = new Date(value);
  const now = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getComparableDate(value) {
  return value ? new Date(value).getTime() : 0;
}

export function isQaDemoRequest(request) {
  if (!request) {
    return false;
  }

  if (request.is_demo === true) {
    return true;
  }

  const meta = request.meta && typeof request.meta === "object" ? request.meta : {};
  const haystack = [
    request.name,
    request.company_name,
    request.comment,
    request.source,
    meta.company_name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("[qa-check]") ||
    haystack.includes("structured demo check") ||
    haystack.includes("structured auto service qa") ||
    haystack.includes("structured demo-request check") ||
    haystack.includes("creator handoff qa") ||
    haystack.includes("qa structured center") ||
    haystack.includes("structured handoff check")
  );
}

export function getDemoRequestMeta(request) {
  return request?.meta && typeof request.meta === "object" ? request.meta : {};
}

export function getDemoRequestCreatorFollowUpAt(request) {
  const meta = getDemoRequestMeta(request);
  return meta.creator_follow_up_at || null;
}

export function getDemoRequestCreatorNote(request) {
  const meta = getDemoRequestMeta(request);
  return String(meta.creator_note || "").trim();
}

export function getDemoRequestFollowUpState(request) {
  const followUpAt = getDemoRequestCreatorFollowUpAt(request);

  if (!followUpAt) {
    return "none";
  }

  const daysUntil = getDaysUntil(followUpAt);

  if (daysUntil == null) {
    return "none";
  }

  if (daysUntil < 0) {
    return "overdue";
  }

  if (daysUntil === 0) {
    return "today";
  }

  if (daysUntil <= 2) {
    return "soon";
  }

  return "scheduled";
}

export function formatDemoBillingPeriod(value) {
  if (!value) {
    return "Не указан";
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "free_month" || normalized === "free month" || normalized === "бесплатный месяц") {
    return "Бесплатный месяц";
  }

  if (normalized === "год" || normalized === "year" || normalized === "yearly") {
    return "Год";
  }

  if (normalized === "месяц" || normalized === "month" || normalized === "monthly") {
    return "Месяц";
  }

  return value;
}

export function formatActivationStage(value) {
  if (value === "unlinked") {
    return "Без компании";
  }

  if (value === "no_subscription") {
    return "Без подписки";
  }

  if (value === "plan_mismatch") {
    return "Мимо тарифа";
  }

  if (value === "company_inactive") {
    return "Компания не активна";
  }

  if (value === "not_connected") {
    return "Не закрыта";
  }

  return "Готово";
}

export function getDemoRequestCommerceSnapshot(request) {
  const comment = request?.comment || "";
  const pairs = comment.split("|").map((item) => item.trim()).filter(Boolean);
  const meta = getDemoRequestMeta(request);
  const data = {
    companyName: meta.company_name || request?.company_name || "",
    role: meta.role || "",
    plan: meta.plan || "",
    billing: meta.billing || "",
    ownerEmail: meta.owner_email || "",
    teamSize: meta.team_size ? String(meta.team_size) : "",
    locations: meta.locations_count ? String(meta.locations_count) : ""
  };

  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.split(":");
    if (!rawKey || !rest.length) {
      continue;
    }

    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "компания" && !data.companyName) data.companyName = value;
    if (key === "роль" && !data.role) data.role = value;
    if (key === "план" && !data.plan) data.plan = value;
    if (key === "период" && !data.billing) data.billing = value;
    if (key === "сотрудники" && !data.teamSize) data.teamSize = value;
    if (key === "локации" && !data.locations) data.locations = value;
  }

  return data;
}

export function getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId) {
  const commerce = getDemoRequestCommerceSnapshot(request);
  const linkedCompany = request?.connected_company_id ? companiesById.get(request.connected_company_id) || null : null;
  const linkedSubscription = linkedCompany ? subscriptionsByCompanyId.get(linkedCompany.id) || null : null;
  const storefrontPlan = String(commerce.plan || "").trim().toLowerCase();
  const suggestedPlanCode = storefrontPlanToCompanyPlan[storefrontPlan] || null;
  const billingPeriodLabel = formatDemoBillingPeriod(commerce.billing);
  let stage = "ready_check";
  let priority = 1;
  let nextStep = "Проверить запуск и первый вход";

  if (!linkedCompany) {
    stage = "unlinked";
    priority = 5;
    nextStep = "Связать заявку с компанией";
  } else if (!linkedSubscription) {
    stage = "no_subscription";
    priority = 4;
    nextStep = "Завести подписку компании";
  } else if (suggestedPlanCode && linkedSubscription.plan_code !== suggestedPlanCode) {
    stage = "plan_mismatch";
    priority = 3;
    nextStep = "Сверить тариф CRM с выбранным пакетом";
  } else if (linkedCompany.status !== "active") {
    stage = "company_inactive";
    priority = 2;
    nextStep = "Перевести компанию в active";
  } else if ((request?.status || "new") !== "connected") {
    stage = "not_connected";
    priority = 2;
    nextStep = "Довести до статуса «Подключена»";
  }

  if ((request?.status || "new") === "qualified") {
    priority += 1;
  }

  if ((request?.status || "new") === "new") {
    priority -= 1;
  }

  return {
    commerce,
    linkedCompany,
    linkedSubscription,
    suggestedPlanCode,
    billingPeriodLabel,
    requestStatus: request?.status || "new",
    stage,
    priority,
    nextStep
  };
}

export function getActivationChecklistItems(activationState) {
  if (!activationState) {
    return [];
  }

  const planLabel = activationState.suggestedPlanCode
    ? planLabels[activationState.suggestedPlanCode] || activationState.suggestedPlanCode
    : "Решить вручную";
  const currentPlanLabel = activationState.linkedSubscription?.plan_code
    ? planLabels[activationState.linkedSubscription.plan_code] || activationState.linkedSubscription.plan_code
    : "Нет тарифа";

  return [
    {
      key: "company",
      done: Boolean(activationState.linkedCompany),
      label: activationState.linkedCompany ? "Компания привязана" : "Привязать заявку к компании"
    },
    {
      key: "subscription",
      done: Boolean(activationState.linkedSubscription),
      label: activationState.linkedSubscription ? "Подписка заведена" : "Завести подписку компании"
    },
    {
      key: "plan",
      done: !activationState.suggestedPlanCode || activationState.linkedSubscription?.plan_code === activationState.suggestedPlanCode,
      label:
        !activationState.suggestedPlanCode || activationState.linkedSubscription?.plan_code === activationState.suggestedPlanCode
          ? `Тариф совпадает: ${activationState.suggestedPlanCode ? planLabel : currentPlanLabel}`
          : `Сверить тариф: ${currentPlanLabel} -> ${planLabel}`
    },
    {
      key: "company_status",
      done: !activationState.linkedCompany || activationState.linkedCompany.status === "active",
      label:
        !activationState.linkedCompany || activationState.linkedCompany.status === "active"
          ? "Компания активна"
          : "Перевести компанию в active"
    },
    {
      key: "connected",
      done: activationState.requestStatus === "connected",
      label: activationState.requestStatus === "connected" ? "Заявка закрыта как подключение" : "Закрыть заявку в connected"
    }
  ];
}

export function getCompanyGoLiveChecklist(company, subscription, activationState = null) {
  const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
  const renewDaysLeft = getDaysUntil(subscription?.renews_at);
  const billingStatus = subscription?.billing_status || "";
  const items = [
    {
      key: "company_status",
      done: company?.status === "active",
      label: company?.status === "active" ? "Компания active" : "Перевести компанию в active"
    },
    {
      key: "owner",
      done: Boolean(company?.owner_connected_at),
      label: company?.owner_connected_at ? "Owner подключён" : "Подключить owner в company_members"
    },
    {
      key: "members",
      done: Number(company?.active_staff_members_count || 0) > 0,
      label:
        Number(company?.active_staff_members_count || 0) > 0
          ? "Команда подключена"
          : "Подключить manager или master в company_members"
    },
    {
      key: "services",
      done: Number(company?.services_count || 0) > 0,
      label: Number(company?.services_count || 0) > 0 ? "Услуги заведены" : "Завести активные услуги"
    },
    {
      key: "subscription",
      done: Boolean(subscription),
      label: subscription ? "Подписка создана" : "Создать запись company_subscriptions"
    },
    {
      key: "billing",
      done: billingStatus === "active" || billingStatus === "manual",
      label:
        billingStatus === "active"
          ? "Платный billing активен"
          : billingStatus === "manual"
          ? "Ручная оплата настроена"
          : billingStatus === "trial" && trialDaysLeft != null
          ? trialDaysLeft < 0
            ? "Триал истёк: выставить счёт и перевести в paid/manual"
            : `Триал ещё идёт: ${trialDaysLeft} дн. До запуска оплаты`
          : billingStatus === "past_due"
          ? "Есть past_due: закрыть оплату и вернуть в paid/manual"
          : subscription
          ? "Выбрать manual или active billing"
          : "Без биллинга"
    },
    {
      key: "renewal",
      done: !subscription || billingStatus === "trial" || renewDaysLeft == null || renewDaysLeft >= 0,
      label:
        !subscription || billingStatus === "trial" || renewDaysLeft == null
          ? "Renewal не блокирует запуск"
          : renewDaysLeft < 0
          ? "Продление уже просрочено"
          : "Renewal в норме"
    },
    {
      key: "handoff",
      done: !activationState || activationState.stage === "ready_check",
      label:
        !activationState || activationState.stage === "ready_check"
          ? "Handoff закрыт"
          : `Закрыть handoff: ${formatActivationStage(activationState.stage)}`
    }
  ];

  const unresolvedCount = items.filter((item) => !item.done).length;
  const readiness = unresolvedCount === 0 ? "ready" : unresolvedCount <= 2 ? "almost_ready" : "blocked";

  return {
    items,
    unresolvedCount,
    readiness
  };
}

export function getGoLiveLane(company, subscription, activationState = null, goLiveChecklist = null) {
  const unresolvedKeys = new Set((goLiveChecklist?.items || []).filter((item) => !item.done).map((item) => item.key));
  const billingStatus = subscription?.billing_status || "none";

  if (activationState && activationState.stage !== "ready_check") {
    return {
      key: "handoff",
      title: "Ждёт handoff",
      note: activationState.nextStep || "Закрыть handoff после заявки",
      accent: "handoff"
    };
  }

  if (unresolvedKeys.has("owner")) {
    return {
      key: "owner",
      title: "Ждёт owner",
      note: "Нужно довести owner до первого входа и рабочего доступа",
      accent: "owner"
    };
  }

  if (unresolvedKeys.has("members")) {
    return {
      key: "team",
      title: "Ждёт команду",
      note: "Нужно подключить хотя бы одного manager или detailer",
      accent: "team"
    };
  }

  if (unresolvedKeys.has("services")) {
    return {
      key: "services",
      title: "Ждёт услуги",
      note: "Нужно загрузить или проверить рабочий пакет услуг",
      accent: "services"
    };
  }

  if (billingStatus === "trial" || billingStatus === "past_due" || billingStatus === "paused" || unresolvedKeys.has("billing")) {
    return {
      key: "billing",
      title: "Ждёт billing",
      note:
        billingStatus === "trial"
          ? "Нужно выставить счёт, выбрать ручную оплату или перевести компанию в paid"
          : billingStatus === "past_due"
          ? "Нужно закрыть просрочку и вернуть компанию в рабочий billing"
          : billingStatus === "paused"
          ? "Нужно решить, возвращаем ли компанию в платный контур"
          : "Нужно принять решение по оплате и billing-режиму",
      accent: "billing"
    };
  }

  if (unresolvedKeys.has("company_status")) {
    return {
      key: "activation",
      title: "Ждёт активацию",
      note: "Компания собрана, но ещё не переведена в active",
      accent: "activation"
    };
  }

  if (goLiveChecklist?.readiness === "ready") {
    return {
      key: "ready",
      title: "Готова к оплате",
      note: "Контур закрыт, можно уверенно вести в реальные оплаты",
      accent: "ready"
    };
  }

  return {
    key: "steady",
    title: "Под наблюдением",
    note: "Явных блокеров запуска сейчас не видно",
    accent: "steady"
  };
}

export function getCompanyQaRecord({ company, subscription, activation = null }) {
  const planCode = subscription?.plan_code || company.plan_code || "starter";
  const seatLimit = planSeatLimits[planCode];
  const activeMembersCount = Number(company.active_members_count || 0);
  const activeStaffMembersCount = Number(company.active_staff_members_count || 0);
  const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
  const renewDaysLeft = getDaysUntil(subscription?.renews_at);
  const issues = [];
  let severityScore = 0;

  if (company.status === "active" && !company.owner_connected_at) {
    issues.push("Owner ещё не подключён в company_members");
    severityScore += 3;
  }

  if (!company.owner_email && !company.contact_email) {
    issues.push("Нет owner email / contact email");
    severityScore += 3;
  }

  if (company.status === "active" && activeStaffMembersCount === 0) {
    issues.push("Active company без manager/master в company_members");
    severityScore += 3;
  }

  if (company.status === "active" && Number(company.services_count || 0) === 0) {
    issues.push("Active company без активных услуг");
    severityScore += 2;
  }

  if (company.status === "active" && !subscription) {
    issues.push("Active company без записи в company_subscriptions");
    severityScore += 4;
  }

  if ((subscription?.billing_status === "active" || subscription?.billing_status === "manual") && company.status !== "active") {
    issues.push("Оплата активна, но company не в active");
    severityScore += 4;
  }

  if (subscription?.billing_status === "trial" && trialDaysLeft != null && trialDaysLeft < 0) {
    issues.push("Trial уже истёк и не переведён");
    severityScore += 3;
  }

  if (subscription?.billing_status === "past_due") {
    issues.push("Есть past_due по подписке");
    severityScore += 3;
  }

  if (seatLimit != null && activeMembersCount > seatLimit) {
    issues.push(`Лимит мест превышен: ${activeMembersCount}/${seatLimit}`);
    severityScore += 2;
  }

  if (activation && activation.stage !== "ready_check") {
    issues.push(`Handoff не закрыт: ${formatActivationStage(activation.stage)}`);
    severityScore += activation.stage === "unlinked" || activation.stage === "no_subscription" ? 3 : 2;
  }

  const severity = severityScore >= 7 ? "critical" : severityScore >= 3 ? "warning" : "ok";

  return {
    company,
    subscription,
    activation,
    planCode,
    seatLimit,
    activeMembersCount,
    trialDaysLeft,
    renewDaysLeft,
    issues,
    severity,
    severityScore
  };
}

export function getPaidReadinessRecord({ company, subscription, activation = null }) {
  const goLive = getCompanyGoLiveChecklist(company, subscription, activation);
  const billingStatus = subscription?.billing_status || "none";
  const blockers = goLive.items
    .filter((item) => !item.done)
    .map((item) => ({
      key: goLiveBlockerLabels[item.key] || item.key,
      sourceKey: item.key,
      label: item.label
    }));
  const paidReady = goLive.readiness === "ready" && (billingStatus === "active" || billingStatus === "manual");
  const readiness = paidReady ? "ready_for_paid" : goLive.readiness === "almost_ready" ? "almost_ready" : "blocked";
  const billingOpen =
    Boolean(subscription) &&
    company?.status === "active" &&
    Boolean(company?.owner_connected_at) &&
    Number(company?.active_staff_members_count || 0) > 0 &&
    Number(company?.services_count || 0) > 0 &&
    (billingStatus === "trial" || billingStatus === "paused" || billingStatus === "past_due" || billingStatus === "none");
  const manualBillingRecommended = billingOpen && billingStatus !== "active";
  const readyPackEligible =
    !paidReady &&
    blockers.length > 0 &&
    blockers.every((item) =>
      ["company_status", "members", "billing", "services"].includes(item.sourceKey)
    );

  let nextStep = "Можно переводить в реальные оплаты";
  if (!paidReady && blockers.length) {
    nextStep = blockers[0].label;
  } else if (!paidReady && billingStatus === "trial") {
    nextStep = "Выставить счёт и перевести компанию в manual/active";
  } else if (!paidReady && billingStatus === "past_due") {
    nextStep = "Закрыть past_due и вернуть компанию в manual/active";
  } else if (!paidReady && billingStatus === "paused") {
    nextStep = "Решить возврат из paused в manual/active";
  }

  return {
    company,
    subscription,
    activation,
    goLive,
    billingStatus,
    blockers,
    paidReady,
    readiness,
    nextStep,
    billingOpen,
    manualBillingRecommended,
    readyPackEligible
  };
}

export function getCommercialCloseStage(subscription, events = []) {
  const notes = String(subscription?.notes || "");
  const hasEvent = (eventType) => events.some((event) => event?.event_type === eventType);

  if (
    subscription?.billing_status === "active" ||
    notes.includes("first payment confirmed") ||
    hasEvent("payment_confirmed")
  ) {
    return "payment_confirmed";
  }

  if (notes.includes("invoice sent to owner") || hasEvent("invoice_sent")) {
    return "invoice_sent";
  }

  if (
    subscription?.billing_status === "manual" ||
    notes.includes("manual billing prepared") ||
    hasEvent("manual_prepared")
  ) {
    return "manual_prepared";
  }

  if (
    subscription?.billing_status === "paused" &&
    (notes.includes("paused after no payment confirmation") || hasEvent("payment_paused"))
  ) {
    return "payment_paused";
  }

  return "not_started";
}

export function formatCommercialCloseStage(value) {
  if (value === "manual_prepared") {
    return "Manual prepared";
  }
  if (value === "invoice_sent") {
    return "Invoice sent";
  }
  if (value === "payment_confirmed") {
    return "Paid confirmed";
  }
  if (value === "payment_paused") {
    return "Paused";
  }
  return "Not started";
}

export function getCommercialCloseStageTone(value) {
  if (value === "payment_confirmed") {
    return "active";
  }
  if (value === "invoice_sent") {
    return "paused";
  }
  if (value === "manual_prepared") {
    return "attention";
  }
  if (value === "payment_paused") {
    return "archived";
  }
  return "ghost";
}

export function getRealOnboardingRecord({
  request,
  companiesById,
  subscriptionsByCompanyId,
  subscriptionEventsByCompanyId = new Map()
}) {
  const activation = getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId);
  const company = activation.linkedCompany || null;
  const subscription = activation.linkedSubscription || null;
  const subscriptionEvents = company ? subscriptionEventsByCompanyId.get(company.id) || [] : [];
  const paidReadiness = company ? getPaidReadinessRecord({ company, subscription, activation }) : null;
  const commercialStage = subscription ? getCommercialCloseStage(subscription, subscriptionEvents) : "not_started";
  const blockers = paidReadiness?.blockers || [];
  const hasLaunchBlocker = (sourceKey) => blockers.some((blocker) => blocker.sourceKey === sourceKey);
  const requestStatus = request?.status || "new";
  const followUpAt = getDemoRequestCreatorFollowUpAt(request);
  const followUpState = getDemoRequestFollowUpState(request);
  const creatorNote = getDemoRequestCreatorNote(request);

  let queueKey = "lead";
  let queueLabel = "Новый лид";
  let nextStep = requestStatus === "new" ? "Связаться с owner и подтвердить сценарий запуска" : activation.nextStep;
  let priority = activation.priority || 0;

  if (!company) {
    queueKey = "company";
    queueLabel = "Создать компанию";
    nextStep = "Создать компанию + trial и связать лид с company";
    priority = 80 + (requestStatus === "qualified" ? 10 : requestStatus === "contacted" ? 5 : 0);
  } else if (activation.stage === "no_subscription") {
    queueKey = "subscription";
    queueLabel = "Завести подписку";
    nextStep = "Создать company_subscriptions и подтянуть тариф из handoff";
    priority = 75;
  } else if (activation.stage === "plan_mismatch") {
    queueKey = "plan";
    queueLabel = "Сверить тариф";
    nextStep = "Исправить plan_code под выбор owner из витрины";
    priority = 72;
  } else if (activation.stage === "company_inactive") {
    queueKey = "activation";
    queueLabel = "Перевести в active";
    nextStep = "Включить компанию как рабочую перед paid-close";
    priority = 70;
  } else if (activation.stage === "not_connected") {
    queueKey = "handoff_close";
    queueLabel = "Закрыть handoff";
    nextStep = "Довести storefront lead до connected и зафиксировать handoff";
    priority = 68;
  } else if (!paidReadiness) {
    queueKey = "launch";
    queueLabel = "Launch prep";
    nextStep = "Проверить запуск компании вручную";
    priority = 60;
  } else if (paidReadiness.paidReady) {
    queueKey = "paid_ready";
    queueLabel = "Ready / paid";
    nextStep = "Компания уже готова к реальной оплате и запуску";
    priority = 10;
  } else if (commercialStage === "invoice_sent") {
    queueKey = "invoice_followup";
    queueLabel = "Invoice sent";
    nextStep = "Проверить оплату owner и подтвердить paid";
    priority = 95;
  } else if (commercialStage === "manual_prepared") {
    queueKey = "invoice_send";
    queueLabel = "Manual ready";
    nextStep = "Отправить owner счёт и реквизиты";
    priority = 90;
  } else if (commercialStage === "payment_paused") {
    queueKey = "payment_paused";
    queueLabel = "Пауза без оплаты";
    nextStep = "Вернуть компанию в manual billing и дожать оплату";
    priority = 88;
  } else if (paidReadiness.manualBillingRecommended || (blockers.length === 1 && blockers[0]?.sourceKey === "billing")) {
    queueKey = "commercial";
    queueLabel = "Manual billing";
    nextStep = "Подготовить manual billing и owner payment pack";
    priority = 85;
  } else if (
    hasLaunchBlocker("owner") ||
    hasLaunchBlocker("members") ||
    hasLaunchBlocker("services") ||
    hasLaunchBlocker("company_status")
  ) {
    queueKey = "launch";
    queueLabel = "Launch prep";
    nextStep = paidReadiness.nextStep;
    priority = 65;
  } else {
    queueKey = "commercial";
    queueLabel = "Commercial close";
    nextStep = paidReadiness.nextStep;
    priority = 62;
  }

  if (queueKey !== "paid_ready") {
    if (followUpState === "overdue") {
      priority += 12;
    } else if (followUpState === "today") {
      priority += 8;
    } else if (followUpState === "soon") {
      priority += 4;
    }
  }

  return {
    request,
    activation,
    company,
    subscription,
    subscriptionEvents,
    paidReadiness,
    goLive: paidReadiness?.goLive || null,
    blockers,
    billingStatus: paidReadiness?.billingStatus || subscription?.billing_status || "none",
    readiness: paidReadiness?.readiness || "blocked",
    paidReady: Boolean(paidReadiness?.paidReady),
    manualBillingRecommended: Boolean(paidReadiness?.manualBillingRecommended),
    readyPackEligible: Boolean(paidReadiness?.readyPackEligible),
    commercialStage,
    followUpAt,
    followUpState,
    creatorNote,
    queueKey,
    queueLabel,
    nextStep,
    priority,
    requiresAction: queueKey !== "paid_ready"
  };
}

export function getCreatorControlState(company, subscription, activationState = null, qaRecord = null, goLiveChecklist = null) {
  const billingStatus = subscription?.billing_status || "";
  const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
  const renewDaysLeft = getDaysUntil(subscription?.renews_at);
  const actionItems = [];
  let bucket = "autopilot";
  let priority = 0;
  let nextStep = "Наблюдение без ручного вмешательства";
  let dueLabel = "Автоконтроль";

  if (qaRecord?.severity === "critical") {
    bucket = "qa";
    priority = 100;
    nextStep = qaRecord.issues[0] || "Проверить multi-company контур";
    dueLabel = "Критично";
    actionItems.push(...qaRecord.issues.slice(0, 3));
  } else {
    if (billingStatus === "past_due") {
      bucket = "billing";
      priority += 90;
      nextStep = "Закрыть просрочку по оплате";
      dueLabel = "Просрочка";
      actionItems.push("Связаться с владельцем по оплате");
    }

    if (billingStatus === "paused") {
      bucket = "billing";
      priority += 70;
      nextStep = "Решить возврат из паузы";
      dueLabel = "На паузе";
      actionItems.push("Проверить статус компании и подписки");
    }

    if (billingStatus === "trial" && trialDaysLeft != null && trialDaysLeft <= 7) {
      bucket = bucket === "autopilot" ? "billing" : bucket;
      priority += trialDaysLeft < 0 ? 80 : 55;
      nextStep = trialDaysLeft < 0 ? "Принять решение по истёкшему trial" : "Довести trial до оплаты";
      dueLabel = trialDaysLeft < 0 ? "Trial истёк" : `${trialDaysLeft} дн. до конца trial`;
      actionItems.push(trialDaysLeft < 0 ? "Триал уже закончился" : "Триал скоро закончится");
    }

    if ((billingStatus === "active" || billingStatus === "manual") && renewDaysLeft != null && renewDaysLeft <= 14) {
      bucket = bucket === "autopilot" ? "billing" : bucket;
      priority += renewDaysLeft < 0 ? 75 : 45;
      nextStep = renewDaysLeft < 0 ? "Разобрать просроченное renewal" : "Подготовить продление";
      dueLabel = renewDaysLeft < 0 ? "Renewal просрочен" : `${renewDaysLeft} дн. до renewal`;
      actionItems.push(renewDaysLeft < 0 ? "Продление уже просрочено" : "Скоро следующее продление");
    }

    if (activationState && activationState.stage !== "ready_check") {
      if (bucket === "autopilot" || bucket === "billing") {
        bucket = "onboarding";
      }
      priority += activationState.priority * 10;
      nextStep = activationState.nextStep;
      dueLabel = formatActivationStage(activationState.stage);
      actionItems.push(`Handoff: ${formatActivationStage(activationState.stage)}`);
    }

    if (goLiveChecklist?.readiness === "blocked") {
      if (bucket === "autopilot" || bucket === "billing") {
        bucket = "onboarding";
      }
      priority += 50;
      nextStep = goLiveChecklist.items.find((item) => !item.done)?.label || "Закрыть блокеры запуска";
      dueLabel = "Есть блокеры";
      actionItems.push("Go-live ещё не закрыт");
    } else if (goLiveChecklist?.readiness === "almost_ready") {
      if (bucket === "autopilot") {
        bucket = "ready";
      }
      priority += 25;
      nextStep =
        billingStatus === "trial" || billingStatus === "paused" || billingStatus === "past_due"
          ? "Выставить счёт и дожать компанию до manual/active"
          : goLiveChecklist.items.find((item) => !item.done)?.label || "Дожать запуск";
      dueLabel = "Почти готова";
      actionItems.push("Осталось 1-2 шага до paid launch");
    }
  }

  if (!actionItems.length) {
    actionItems.push("Компания выглядит управляемо из creator-слоя");
  }

  const titles = {
    autopilot: "Автопилот",
    billing: "Billing control",
    onboarding: "Onboarding",
    ready: "Ready to bill",
    qa: "QA / hardening"
  };

  return {
    bucket,
    title: titles[bucket] || "Контроль",
    priority,
    nextStep,
    dueLabel,
    actionItems: actionItems.slice(0, 3)
  };
}
