import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  addLeadNoteRecord,
  createLeadEvent,
  createLeadRecord,
  createOrReuseClient,
  sendAutomationWebhook,
  submitPublicLead,
  submitPublicReview,
  uploadLeadAttachmentFile,
  updateLeadFollowUpRecord,
  updateLeadStatusRecord
} from "./crm";
import detailLogo from "./detailLogo";
import {
  formatCommercialCloseStage,
  formatActivationStage,
  getCommercialCloseStage,
  getCommercialCloseStageTone,
  formatDemoBillingPeriod,
  getActivationChecklistItems,
  getComparableDate,
  getCompanyGoLiveChecklist,
  getCompanyQaRecord,
  getCreatorControlState,
  getDemoRequestCreatorFollowUpAt,
  getDemoRequestCreatorNote,
  getDemoRequestFollowUpState,
  getDemoRequestMeta,
  getDaysUntil,
  getDemoRequestActivationState,
  getDemoRequestCommerceSnapshot,
  getGoLiveLane,
  isQaDemoRequest,
  getPaidReadinessRecord,
  getRealOnboardingRecord,
  planLabels,
  planSeatLimits,
  storefrontPlanToCompanyPlan
} from "./platformReadiness";
import { getAuthRedirectUrl, supabase } from "./supabase";

const navItems = [
  { to: "/dashboard", label: "Панель" },
  { to: "/leads", label: "Заявки" },
  { to: "/clients", label: "Клиенты" },
  { to: "/tasks", label: "Задачи" },
  { to: "/settings", label: "Настройки" }
];

const roleLabels = {
  platform_admin: "Создатель",
  owner: "Директор",
  manager: "Менеджер",
  detailer: "Мастер"
};

const platformEurFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0
});

const companyStatusAccessHints = {
  active: {
    title: "Компания активна",
    description: "Можно войти в кабинет и работать в обычном режиме."
  },
  paused: {
    title: "Компания на паузе",
    description: "Вход для действующих сотрудников доступен, но новая регистрация и клиентская форма отключены."
  },
  archived: {
    title: "Компания в архиве",
    description: "Новые подключения и клиентская форма отключены. Для доступа свяжитесь с создателем CRM."
  }
};

function getCompanyReadOnlyMessage(company) {
  if (!company || company.status === "active") {
    return "";
  }

  if (company.status === "paused") {
    return "Компания на паузе. Просмотр CRM доступен, но изменение заявок, команды, услуг и настроек временно отключено.";
  }

  if (company.status === "archived") {
    return "Компания в архиве. CRM открывается только для просмотра, без изменений данных.";
  }

  return "Изменение данных этой компании сейчас отключено.";
}

const roleOptions = ["owner", "manager", "detailer"];

const rolePermissions = {
  owner: {
    nav: ["/dashboard", "/leads", "/clients", "/tasks", "/settings"],
    canCreateLead: true,
    canEditLead: true
  },
  manager: {
    nav: ["/dashboard", "/leads", "/clients", "/tasks"],
    canCreateLead: true,
    canEditLead: true
  },
  detailer: {
    nav: ["/dashboard", "/leads", "/tasks"],
    canCreateLead: false,
    canEditLead: false
  }
};

const statusOptions = ["new", "contacted", "quoted", "scheduled", "in_progress", "done", "delivered", "lost"];
const sourceOptions = ["manual", "landing", "instagram", "telegram", "whatsapp", "phone", "facebook", "other"];
const clientTabs = ["history", "leads", "notes"];
const settingsSections = ["profile", "company", "team", "billing", "integrations", "security"];
const paymentStatusOptions = ["unpaid", "partial", "paid"];
const paymentMethodOptions = ["cash", "card", "transfer", "other"];
const demoServicePresetsByBusinessType = {
  detailing: [
    { name: "Spalare exterioara", base_price: 600, duration_minutes: 60 },
    { name: "Curatare salon", base_price: 1200, duration_minutes: 180 },
    { name: "Spalare detaliata", base_price: 800, duration_minutes: 90 },
    { name: "Detailing interior", base_price: 1800, duration_minutes: 180 },
    { name: "Polizare completa", base_price: 2800, duration_minutes: 300 },
    { name: "Detailing complet", base_price: 4200, duration_minutes: 360 },
    { name: "Ceramica", base_price: 4500, duration_minutes: 360 },
    { name: "Polizare + Ceramica", base_price: 6000, duration_minutes: 480 },
    { name: "Consultatie coating ceramic", base_price: 300, duration_minutes: 30 }
  ],
  car_wash: [
    { name: "Spalare exterioara", base_price: 250, duration_minutes: 25 },
    { name: "Spalare premium", base_price: 400, duration_minutes: 40 },
    { name: "Spalare detaliata", base_price: 700, duration_minutes: 75 },
    { name: "Curatare salon", base_price: 650, duration_minutes: 60 },
    { name: "Curatare portbagaj", base_price: 300, duration_minutes: 30 },
    { name: "Ceara rapida", base_price: 350, duration_minutes: 25 },
    { name: "Curatare jante", base_price: 200, duration_minutes: 20 }
  ],
  tire_service: [
    { name: "Замена 4 колес", base_price: 500, duration_minutes: 45 },
    { name: "Балансировка", base_price: 320, duration_minutes: 35 },
    { name: "Ремонт прокола", base_price: 180, duration_minutes: 20 },
    { name: "Сезонное хранение", base_price: 900, duration_minutes: 25 },
    { name: "Проверка давления", base_price: 80, duration_minutes: 10 },
    { name: "Подкачка и контроль", base_price: 120, duration_minutes: 15 },
    { name: "Комплекс шиномонтажа", base_price: 750, duration_minutes: 60 }
  ],
  auto_service: [
    { name: "Диагностика ходовой", base_price: 450, duration_minutes: 40 },
    { name: "Замена масла", base_price: 700, duration_minutes: 45 },
    { name: "Компьютерная диагностика", base_price: 500, duration_minutes: 35 },
    { name: "Тормозная система", base_price: 900, duration_minutes: 75 },
    { name: "Подвеска и рулевое", base_price: 1200, duration_minutes: 120 },
    { name: "Ремонт кондиционера", base_price: 850, duration_minutes: 90 },
    { name: "Плановое ТО", base_price: 1500, duration_minutes: 150 }
  ]
};

const statusLabels = {
  new: "Принято",
  accepted: "Принято",
  contacted: "Принято",
  diagnostics: "Осмотр / приёмка / согласование",
  quoted: "Осмотр / приёмка / согласование",
  approval: "Осмотр / приёмка / согласование",
  scheduled: "Запланировано / ждём клиента",
  in_progress: "В работе",
  waiting_client: "Запланировано / ждём клиента",
  waiting_payment: "Готово к выдаче",
  done: "Готово к выдаче",
  delivered: "Выдана",
  paid: "Оплачено",
  follow_up: "Повторный контакт",
  lost: "Отменено"
};

const statusLabelsByBusinessType = {
  detailing: {
    new: "Принято",
    accepted: "Принято",
    contacted: "Принято",
    diagnostics: "Осмотр / приёмка / согласование",
    quoted: "Осмотр / приёмка / согласование",
    approval: "Осмотр / приёмка / согласование",
    scheduled: "Запланировано / ждём клиента",
    in_progress: "В работе",
    waiting_client: "Запланировано / ждём клиента",
    waiting_payment: "Готово к выдаче",
    done: "Готово к выдаче",
    delivered: "Выдана"
  },
  car_wash: {
    new: "Новая запись",
    accepted: "Принято",
    contacted: "Принято",
    quoted: "Подтверждение деталей",
    scheduled: "Запись подтверждена",
    in_progress: "Машина на посту",
    waiting_client: "Ждём клиента",
    waiting_payment: "Ждём оплату",
    done: "Мойка завершена",
    delivered: "Выдана",
    paid: "Оплачено",
    lost: "Запись отменена"
  },
  tire_service: {
    new: "Новая запись",
    accepted: "Принято",
    contacted: "Принято",
    diagnostics: "Осмотр / приёмка",
    quoted: "Осмотр / приёмка / согласование",
    scheduled: "Запись подтверждена",
    in_progress: "Машина на посту",
    waiting_payment: "Ждём оплату",
    done: "Работа завершена",
    delivered: "Выдана",
    paid: "Оплачено",
    lost: "Запись отменена"
  },
  auto_service: {
    new: "Новая заявка",
    accepted: "Принято",
    contacted: "Принято",
    diagnostics: "Диагностика",
    quoted: "Диагностика / согласование",
    approval: "Согласование",
    scheduled: "Запланировано",
    in_progress: "В ремонте",
    waiting_client: "Ждём клиента",
    waiting_payment: "Ждём оплату",
    done: "Готово к выдаче",
    delivered: "Выдана",
    paid: "Оплачено",
    lost: "Запись отменена"
  }
};

const statusGroupLabels = {
  new: "Новые",
  in_progress: "В работе",
  done: "Готово",
  delivered: "Выдана",
  lost: "Отменено"
};

const statusGroupLabelsByBusinessType = {
  detailing: {
    new: "Новые заявки",
    in_progress: "Машины в работе",
    done: "Готово к выдаче",
    delivered: "Выдана",
    lost: "Отменено"
  },
  car_wash: {
    new: "Записи в очереди",
    in_progress: "Машины на посту",
    done: "Готово к выдаче",
    delivered: "Выдана",
    lost: "Отменено"
  },
  tire_service: {
    new: "Записи на прием",
    in_progress: "Машины на посту",
    done: "Готово к выдаче",
    delivered: "Выдана",
    lost: "Отменено"
  }
};

const compactLeadStageOptions = ["new", "in_progress", "done", "delivered", "lost"];

const eventLabels = {
  created: "Заявка создана",
  status_changed: "Статус изменён",
  note_added: "Добавлена заметка",
  follow_up_set: "Следующий контакт обновлён",
  assigned: "Назначено",
  price_updated: "Обновлена сумма",
  payment_updated: "Оплата обновлена",
  reminder_sent: "Отправлено напоминание"
};

const sourceLabels = {
  manual: "Вручную",
  landing: "Сайт",
  instagram: "Инстаграм",
  telegram: "Телеграм",
  whatsapp: "Вотсап",
  phone: "Телефон",
  facebook: "Фейсбук",
  other: "Другое"
};

const paymentStatusLabels = {
  unpaid: "Не оплачено",
  partial: "Частично",
  paid: "Оплачено"
};

const paymentMethodLabels = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
  other: "Другое"
};

const businessTypeLabels = {
  detailing: "Детейлинг",
  car_wash: "Автомойка",
  tire_service: "Шиномонтаж",
  auto_service: "Автосервис"
};

function getDemoServicePresets(businessType) {
  return demoServicePresetsByBusinessType[businessType] || demoServicePresetsByBusinessType.detailing;
}

const publicBusinessTypeContent = {
  detailing: {
    eyebrow: "Онлайн-заявка",
    title: "Запишитесь на детейлинг без звонков и ожидания.",
    description: "Оставьте заявку за минуту. Команда сразу увидит запрос и подтвердит удобное время.",
    intro: "4 коротких шага: услуга, автомобиль, время и контакт.",
    imageAlt: "Премиальный автомобиль после детейлинга"
  },
  car_wash: {
    eyebrow: "Онлайн-запись",
    title: "Запишитесь на автомойку быстро и без лишних звонков.",
    description: "Выберите услугу и время. Команда сразу увидит запись.",
    intro: "4 шага: услуга, машина, время и контакт.",
    imageAlt: "Автомобиль после мойки"
  },
  tire_service: {
    eyebrow: "Онлайн-запись",
    title: "Запишитесь на шиномонтаж без очередей и путаницы.",
    description: "Оставьте заявку заранее. Команда подготовит слот и быстрее примет машину.",
    intro: "4 шага: услуга, машина, время и контакт.",
    imageAlt: "Автомобиль на шиномонтаже"
  },
  auto_service: {
    eyebrow: "Онлайн-запись",
    title: "Запишитесь на автосервис без лишних звонков и ожидания.",
    description: "Опишите машину и услугу, выберите удобное время, а команда подготовит прием заранее.",
    intro: "4 шага: услуга, автомобиль, время и контакт.",
    imageAlt: "Автомобиль в автосервисе"
  }
};

const businessTypeTemplateContent = {
  detailing: {
    summary: "Фокус на полировке, химчистке, керамике, фото до/после и статусах длительной работы.",
    services: ["Мойка кузова", "Химчистка салона", "Полировка", "Керамика"],
    workflow: "Заявка -> приёмка -> согласование -> работа -> фото -> готово -> выдана -> повторный визит",
    statuses: ["Новая", "Принято", "Диагностика", "Согласование", "В работе", "Готово", "Выдана"],
    operationsFocus: "Длинные работы, фото до/после, контроль мастера и уведомление о готовности."
  },
  car_wash: {
    summary: "Фокус на быстром потоке машин, коротких слотах, кассе и повторных визитах.",
    services: ["Экспресс-мойка", "Премиум-мойка", "Уборка салона", "Воск"],
    workflow: "Запись -> подтверждение -> пост -> мойка -> готово -> выдана -> повторный визит",
    statuses: ["Новая", "Принято", "Запланировано", "В работе", "Готово", "Выдана"],
    operationsFocus: "Быстрая выдача, короткие слоты, высокая оборачиваемость и кассовый контроль."
  },
  tire_service: {
    summary: "Фокус на сезонной загрузке, замене колес, балансировке и быстрой выдаче машины.",
    services: ["Замена 4 колес", "Балансировка", "Ремонт прокола", "Хранение шин"],
    workflow: "Заявка -> приёмка -> диагностика -> шиномонтаж -> готово -> выдана",
    statuses: ["Новая", "Принято", "Диагностика", "В работе", "Готово", "Выдана"],
    operationsFocus: "Сезонный поток, скорость поста, очередь, хранение шин и быстрый прием машины."
  },
  auto_service: {
    summary: "Фокус на диагностике, ремонте, плановом ТО, запасных частях и понятной загрузке постов.",
    services: ["Диагностика", "Замена масла", "Тормоза", "Плановое ТО"],
    workflow: "Заявка -> приёмка -> диагностика -> согласование -> ремонт -> готово -> выдана",
    statuses: ["Новая", "Принято", "Диагностика", "Согласование", "В работе", "Готово", "Выдана"],
    operationsFocus: "Посты, приемка, запчасти, согласование работ и прозрачный статус ремонта."
  }
};

function getBusinessTypeTemplate(businessType) {
  return businessTypeTemplateContent[businessType] || businessTypeTemplateContent.detailing;
}

function getDetailedStatusOptions(businessType = "detailing") {
  const defaults = [
    { value: "contacted", label: "Принято" },
    { value: "quoted", label: "Осмотр / приёмка / согласование" },
    { value: "scheduled", label: "Запланировано / ждём клиента" }
  ];

  if (businessType === "detailing") {
    return [
      { value: "contacted", label: "Принято" },
      { value: "quoted", label: "Осмотр / приёмка / согласование" },
      { value: "scheduled", label: "Запланировано / ждём клиента" }
    ];
  }

  if (businessType === "car_wash") {
    return [
      { value: "contacted", label: "Принято" },
      { value: "quoted", label: "Осмотр / приёмка / согласование" },
      { value: "scheduled", label: "Запланировано / ждём клиента" }
    ];
  }

  if (businessType === "tire_service") {
    return [
      { value: "contacted", label: "Принято" },
      { value: "quoted", label: "Осмотр / приёмка / согласование" },
      { value: "scheduled", label: "Запланировано / ждём клиента" }
    ];
  }

  if (businessType === "auto_service") {
    return [
      { value: "contacted", label: "Принято" },
      { value: "quoted", label: "Осмотр / приёмка / согласование" },
      { value: "scheduled", label: "Запланировано / ждём клиента" }
    ];
  }

  return defaults;
}

function getStatusGroupLabels(businessType) {
  return statusGroupLabelsByBusinessType[businessType] || statusGroupLabels;
}

function formatStatusLabel(status, businessType = "detailing") {
  if (!status) {
    return "Не задано";
  }

  return statusLabelsByBusinessType[businessType]?.[status] || statusLabels[status] || formatLabel(status);
}

function getBusinessTypeStageGuidance(businessType, status) {
  const stageKey = getLeadStageKey(status);
  const guidanceByBusinessType = {
    detailing: {
      new: {
        now: "Заявка принята и ожидает подтверждения деталей по машине и услуге.",
        next: "Связаться с клиентом, подтвердить объем работы и поставить удобный слот."
      },
      in_progress: {
        now: "Машина находится в процессе работы, важны этапы, фото и контроль качества.",
        next: "Обновлять статус по этапам, фиксировать фото и подготовить выдачу."
      },
      done: {
        now: "Работа завершена, клиент может забирать автомобиль.",
        next: "Сообщить о готовности, зафиксировать оплату и закрыть визит."
      },
      delivered: {
        now: "Автомобиль выдан клиенту, визит закрыт по работе.",
        next: "Проверить оплату, сохранить итог и при необходимости поставить повторный контакт."
      },
      lost: {
        now: "Заявка не перешла в работу или была отменена.",
        next: "Зафиксировать причину потери и при необходимости вернуть клиента позже."
      }
    },
    car_wash: {
      new: {
        now: "Запись создана и ждет быстрого подтверждения времени.",
        next: "Подтвердить окно, принять машину без задержки и отправить в работу."
      },
      in_progress: {
        now: "Машина на посту, ключевое сейчас — скорость и поток без простоев.",
        next: "Закончить мойку, провести выдачу и сразу отметить оплату."
      },
      done: {
        now: "Мойка завершена и автомобиль готов к выдаче.",
        next: "Выдать машину, закрыть оплату и предложить следующий визит."
      },
      delivered: {
        now: "Автомобиль уже выдан после мойки.",
        next: "Проверить оплату и при необходимости поставить повторный визит."
      },
      lost: {
        now: "Запись сорвалась или клиент не доехал.",
        next: "Отметить причину и при необходимости предложить новую запись."
      }
    },
    tire_service: {
      new: {
        now: "Запись на шиномонтаж или ремонт шин ожидает подтверждения времени и поста.",
        next: "Подтвердить слот, подготовить прием машины и нужный тип услуги."
      },
      in_progress: {
        now: "Машина на посту, идет шиномонтаж, балансировка или ремонт.",
        next: "Завершить работу, проверить колеса и подготовить выдачу клиенту."
      },
      done: {
        now: "Работа завершена, колеса готовы и машина может быть выдана.",
        next: "Сообщить о готовности, закрыть оплату и при необходимости предложить хранение шин."
      },
      delivered: {
        now: "Машина выдана клиенту после шиномонтажа.",
        next: "Проверить оплату и сохранить итог по визиту."
      },
      lost: {
        now: "Заявка не дошла до выполнения или была отменена.",
        next: "Сохранить причину отмены и при необходимости вернуть клиента в сезон."
      }
    }
  };

  const businessGuidance = guidanceByBusinessType[businessType] || guidanceByBusinessType.detailing;
  return businessGuidance[stageKey] || businessGuidance.new;
}

function getPublicStatusSummaryGuidance(status) {
  if (status === "new" || status === "accepted") {
    return {
      title: "Заявка принята",
      text: "Команда уже видит вашу заявку и скоро подтвердит детали визита или работы по автомобилю."
    };
  }

  if (status === "diagnostics" || status === "approval") {
    return {
      title: "Идёт согласование работ",
      text: "Команда уточняет объём услуги, осмотр или согласование по машине. После подтверждения заявка перейдёт в работу."
    };
  }

  if (status === "scheduled") {
    return {
      title: "Визит подтверждён",
      text: "Заявка уже запланирована. Команда ждёт автомобиль в согласованное время."
    };
  }

  if (status === "in_progress" || status === "waiting_client" || status === "waiting_payment") {
    return {
      title: "Автомобиль в работе",
      text: "Работа по машине уже идет. Когда этап будет обновлен или появятся фото, это сразу отобразится на странице."
    };
  }

  if (status === "done" || status === "paid") {
    return {
      title: "Автомобиль готов",
      text: "Основная работа завершена. Осталось выдать машину и закрыть визит."
    };
  }

  if (status === "delivered") {
    return {
      title: "Автомобиль выдан",
      text: "Визит закрыт: команда выдала автомобиль клиенту и сохранила итог по работе."
    };
  }

  return {
    title: "Заявка остановлена",
    text: "Заявка сейчас не находится в активной работе. Если нужно, команда сможет связаться с вами повторно."
  };
}

function getManagerDashboardCopy(businessType) {
  const copyByBusinessType = {
    detailing: {
      title: "Панель менеджера",
      description: "Приоритетные заявки, контакты на сегодня и быстрый доступ к рабочей очереди без лишних экранов.",
      queueTitle: "Рабочая очередь",
      queueEmpty: "На сегодня нет задач с датой или активных работ.",
      funnelTitle: "Срез по стадиям",
      incomingTitle: "Свежие новые заявки"
    },
    car_wash: {
      title: "Панель менеджера",
      description: "Очередь записей, быстрые подтверждения и поток машин на сегодня без путаницы по постам.",
      queueTitle: "Очередь по постам",
      queueEmpty: "На сегодня нет записей в очереди или машин на посту.",
      funnelTitle: "Срез по потоку",
      incomingTitle: "Новые записи"
    },
    tire_service: {
      title: "Панель менеджера",
      description: "Записи на прием, сезонная очередь и контроль машин на постах без лишних экранов.",
      queueTitle: "Очередь на прием",
      queueEmpty: "На сегодня нет машин в очереди или активных работ на посту.",
      funnelTitle: "Срез по приему",
      incomingTitle: "Новые записи"
    },
    auto_service: {
      title: "Панель менеджера",
      description: "Приёмка, согласование работ и контроль машин в ремонте без потери клиента по дороге.",
      queueTitle: "Очередь по ремонтам",
      queueEmpty: "На сегодня нет машин в ремонте или подтверждённых приёмок.",
      funnelTitle: "Срез по ремонту",
      incomingTitle: "Новые обращения"
    }
  };

  return copyByBusinessType[businessType] || copyByBusinessType.detailing;
}

function getDetailerDashboardCopy(businessType) {
  const copyByBusinessType = {
    detailing: {
      title: "Панель мастера",
      description: "Только назначенные машины, текущие этапы и рабочая очередь без кассы и оплат.",
      todayTitle: "Мои машины",
      statusTitle: "Статусы по моим заявкам",
      todayEmpty: "Сейчас у мастера нет активных назначений на сегодня."
    },
    car_wash: {
      title: "Панель мастера",
      description: "Только машины на ваших постах, текущая мойка и очередь без кассы и лишних экранов.",
      todayTitle: "Мои машины на посту",
      statusTitle: "Статусы по моим мойкам",
      todayEmpty: "Сейчас у сотрудника нет машин на посту или активных назначений на сегодня."
    },
    tire_service: {
      title: "Панель мастера",
      description: "Только принятые машины, текущие работы на посту и очередь без бухгалтерии и лишних экранов.",
      todayTitle: "Мои машины на посту",
      statusTitle: "Статусы по моим работам",
      todayEmpty: "Сейчас у мастера нет активных машин на посту или назначений на сегодня."
    },
    auto_service: {
      title: "Панель мастера",
      description: "Только назначенные машины, этапы ремонта, фото и комментарии по работе без кассы и лишних экранов.",
      todayTitle: "Мои машины в ремонте",
      statusTitle: "Статусы по моим заказам",
      todayEmpty: "Сейчас у мастера нет активных машин в ремонте или назначений на сегодня."
    }
  };

  return copyByBusinessType[businessType] || copyByBusinessType.detailing;
}

function getOwnerDashboardCopy(businessType) {
  const copyByBusinessType = {
    detailing: {
      clientsLabel: "Всего клиентов",
      todayLabel: "Заявки сегодня",
      revenueLabel: "Выручка месяц",
      tasksLabel: "Задачи открыты",
      monthTitle: "Итоги месяца",
      recentTitle: "Последние заявки",
      recentEyebrow: "Оперативная сводка",
      serviceTableEmpty: "В этом месяце пока нет закрытых заявок для кассы."
    },
    car_wash: {
      clientsLabel: "Клиентов базы",
      todayLabel: "Записи сегодня",
      revenueLabel: "Касса месяца",
      tasksLabel: "Машины в очереди",
      monthTitle: "Итоги мойки за месяц",
      recentTitle: "Последние записи",
      recentEyebrow: "Оперативная сводка",
      serviceTableEmpty: "В этом месяце пока нет закрытых моек для кассы."
    },
    tire_service: {
      clientsLabel: "Клиентов базы",
      todayLabel: "Записи сегодня",
      revenueLabel: "Касса месяца",
      tasksLabel: "Машины на постах",
      monthTitle: "Итоги шиномонтажа за месяц",
      recentTitle: "Последние записи",
      recentEyebrow: "Оперативная сводка",
      serviceTableEmpty: "В этом месяце пока нет закрытых работ для кассы."
    },
    auto_service: {
      clientsLabel: "Клиентов базы",
      todayLabel: "Приёмки сегодня",
      revenueLabel: "Касса месяца",
      tasksLabel: "Машины в ремонте",
      monthTitle: "Итоги автосервиса за месяц",
      recentTitle: "Последние заказы",
      recentEyebrow: "Оперативная сводка",
      serviceTableEmpty: "В этом месяце пока нет закрытых ремонтов для кассы."
    }
  };

  return copyByBusinessType[businessType] || copyByBusinessType.detailing;
}

function getClientsPageCopy(businessType) {
  const copyByBusinessType = {
    detailing: {
      title: "Клиенты",
      description: "База клиентов с историей взаимодействий, заявками и заметками команды.",
      listTitle: "Список клиентов",
      cardTitle: "Карточка клиента",
      emptyLeads: "У клиента пока нет заявок.",
      emptyHistory: "У этого клиента ещё нет истории взаимодействий."
    },
    car_wash: {
      title: "Клиенты",
      description: "База клиентов и машин с историей визитов, записей и заметками команды.",
      listTitle: "Список клиентов",
      cardTitle: "Карточка клиента",
      emptyLeads: "У клиента пока нет записей на мойку.",
      emptyHistory: "У этого клиента ещё нет истории визитов."
    },
    tire_service: {
      title: "Клиенты",
      description: "База клиентов и машин с историей обращений, записей и заметками команды.",
      listTitle: "Список клиентов",
      cardTitle: "Карточка клиента",
      emptyLeads: "У клиента пока нет записей на работы.",
      emptyHistory: "У этого клиента ещё нет истории обращений."
    }
  };

  return copyByBusinessType[businessType] || copyByBusinessType.detailing;
}

function getTasksPageCopy(businessType) {
  const copyByBusinessType = {
    detailing: {
      title: "Задачи",
      description: "Открытые напоминания и рабочие заявки, которые требуют действия команды.",
      empty: "Сейчас нет открытых задач для команды."
    },
    car_wash: {
      title: "Задачи",
      description: "Открытые записи, напоминания и машины в потоке, которые требуют внимания команды.",
      empty: "Сейчас нет открытых записей или задач по потоку."
    },
    tire_service: {
      title: "Задачи",
      description: "Открытые записи, напоминания и машины на приеме, которые требуют действия команды.",
      empty: "Сейчас нет открытых задач или записей на прием."
    }
  };

  return copyByBusinessType[businessType] || copyByBusinessType.detailing;
}

const publicBusinessTypeIntakeConfig = {
  detailing: {
    vehicleLabel: "Автомобиль",
    makePlaceholder: "Например, BMW",
    modelPlaceholder: "Например, X5",
    yearPlaceholder: "2020",
    platePlaceholder: "Если удобно, укажите номер",
    timePlaceholder: "Например, после 18:00",
    commentPlaceholder: "Опишите пожелания, состояние кузова, салона или что важно учесть.",
    summaryFallback: "Автомобиль уточним при звонке"
  },
  car_wash: {
    vehicleLabel: "Автомобиль",
    makePlaceholder: "Например, Toyota",
    modelPlaceholder: "Например, Corolla",
    yearPlaceholder: "2021",
    platePlaceholder: "Номер машины поможет быстрее принять запись",
    timePlaceholder: "Например, утром или после работы",
    commentPlaceholder: "Напишите, нужна ли только мойка, уборка салона, воск или что важно учесть.",
    summaryFallback: "Машину уточним перед записью"
  },
  tire_service: {
    vehicleLabel: "Автомобиль",
    makePlaceholder: "Например, Skoda",
    modelPlaceholder: "Например, Kodiaq",
    yearPlaceholder: "2019",
    platePlaceholder: "Номер поможет быстрее принять машину",
    timePlaceholder: "Например, до обеда или к вечеру",
    commentPlaceholder: "Укажите, нужна ли замена колес, балансировка, ремонт прокола или хранение шин.",
    summaryFallback: "Автомобиль уточним при подтверждении"
  },
  auto_service: {
    vehicleLabel: "Автомобиль",
    makePlaceholder: "Например, Volkswagen",
    modelPlaceholder: "Например, Passat",
    yearPlaceholder: "2018",
    platePlaceholder: "Номер или VIN помогут быстрее принять машину",
    timePlaceholder: "Например, утром или после 15:00",
    commentPlaceholder: "Опишите неисправность, жалобу клиента, желаемую диагностику или нужную работу.",
    summaryFallback: "Автомобиль и работы уточним при подтверждении"
  }
};

const billingStatusLabels = {
  trial: "Триал",
  active: "Активна",
  past_due: "Просрочка",
  paused: "На паузе",
  canceled: "Отменена",
  manual: "Вручную"
};

const billingStatusOptions = ["trial", "active", "past_due", "paused", "canceled", "manual"];
const demoRequestStatusOptions = ["new", "contacted", "qualified", "connected", "archived"];
const settingsSectionLabels = {
  profile: "Профиль",
  company: "Компания",
  team: "Команда",
  billing: "Тарифы",
  integrations: "Интеграции",
  security: "Безопасность"
};

const demoRequestStatusLabels = {
  new: "Новая",
  contacted: "Связались",
  qualified: "Квалифицирована",
  connected: "Подключена",
  archived: "Архив"
};

const demoRequestStatusTimestampFields = {
  contacted: "contacted_at",
  qualified: "qualified_at",
  connected: "connected_at",
  archived: "archived_at"
};

const marketingFeatureCards = [
  {
    title: "CRM для автоуслуг",
    text: "Детейлинг, автомойка, шиномонтаж и автостудия работают по понятному для ниши сценарию."
  },
  {
    title: "Заявки, статусы и фото в одном месте",
    text: "Команда видит машину в работе, этап, оплату и фото до/после без мессенджер-хаоса."
  },
  {
    title: "Клиент видит статус по ссылке",
    text: "Меньше лишних звонков, потому что этапы, фото и готовность уже открываются клиенту."
  },
  {
    title: "Мы настраиваем CRM вместе с вами",
    text: "Не просто регистрация, а живое внедрение, запуск и обучение команды под ваш сервис."
  }
];

const marketingRoleCards = [
  {
    title: "Директор",
    text: "За 10 секунд видит новые заявки, деньги, машины в работе и зависшие заказы."
  },
  {
    title: "Менеджер",
    text: "Принимает заявки, согласует работы и держит клиента в одном операционном потоке."
  },
  {
    title: "Мастер",
    text: "Видит свои машины, этапы, фото и следующий шаг без кассы и лишних экранов."
  },
  {
    title: "Клиент",
    text: "Открывает ссылку и видит статус, фото и готовность машины без лишних звонков."
  }
];

const marketingPositioningPoints = [
  "CRM для детейлинга, автомоек, шиномонтажа и автостудий.",
  "Telegram-уведомления, фото до/после и статус машины по ссылке.",
  "Русский и румынский контекст, локальная помощь с запуском в Молдове.",
  "Мы не просто даём программу, а настраиваем CRM под ваш сервис и обучаем команду."
];

const marketingOnboardingSteps = [
  { title: "Зарегистрируйтесь как администратор", text: "Заполните личные данные владельца или администратора, чтобы открыть доступ к системе." },
  { title: "Добавьте информацию о центре", text: "Укажите название, адрес, описание, фотографии, логотип и основные услуги вашего центра." },
  { title: "Укажите команду", text: "Добавьте имя и телефон каждого менеджера и мастера, которые будут работать внутри CRM." },
  { title: "Команда получает доступ", text: "Сотрудники получают вход и короткие инструкции, чтобы сразу подключиться к рабочему процессу." },
  { title: "Начинайте работать в CRM", text: "Принимайте заявки, ведите статусы, фото, оплаты и клиентский путь в одной системе." }
];

const marketingPricingCards = [
  {
    name: "Старт",
    price: "29 EUR",
    note: "в месяц",
    audience: "Для одной точки",
    features: ["До 3 сотрудников", "Заявки и статусы работ", "Публичная запись клиента", "Telegram менеджеру", "Базовая клиентская страница"]
  },
  {
    name: "Про",
    price: "59 EUR",
    note: "в месяц",
    audience: "Для рабочего центра",
    features: ["До 10 сотрудников", "Фото до/после", "Касса и оплаты", "Клиентская страница статуса", "Роли директор / менеджер / мастер"]
  },
  {
    name: "Студия",
    price: "129 EUR",
    note: "в месяц",
    audience: "Для сильной команды",
    features: ["Несколько мастеров и ролей", "Расширенные отчеты", "Подключение Telegram клиенту", "Приоритетная настройка", "Подготовка под SaaS-рост и масштабирование"]
  }
];

const marketingVerticals = [
  { title: "Детейлинг", text: "Фото, статусы и длинные работы." },
  { title: "Автомойка", text: "Быстрый поток и простая касса." },
  { title: "Шиномонтаж", text: "Сезонная запись и быстрый приём." }
];

const marketingCatalogChips = [
  "Детейлинг",
  "Автомойка",
  "Шиномонтаж",
  "Полировка",
  "Химчистка",
  "Керамика",
  "Замена колёс",
  "Диагностика",
  "Все услуги"
];

const marketingPartnerCards = [
  {
    slug: "crystal-detail-garage",
    backendSlug: "detail-crm-demo",
    name: "Crystal Detail Garage",
    location: "Кишинёв · Центр",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "urban-wash-hub",
    backendSlug: "detail-crm-demo",
    name: "Urban Wash Hub",
    location: "Кишинёв · Буюканы",
    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "premium-tire-point",
    backendSlug: "detail-crm-demo",
    name: "Premium Tire Point",
    location: "Бельцы",
    image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "north-bay-auto-spa",
    backendSlug: "detail-crm-demo",
    name: "North Bay Auto Spa",
    location: "Оргеев",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "cleanline-service",
    backendSlug: "detail-crm-demo",
    name: "CleanLine Service",
    location: "Кишинёв · Рышкановка",
    image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "detail-brothers",
    backendSlug: "detail-crm-demo",
    name: "Detail Brothers",
    location: "Комрат",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "fast-lane-wash",
    backendSlug: "detail-crm-demo",
    name: "Fast Lane Wash",
    location: "Кагул",
    image: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "garage-24-auto-care",
    backendSlug: "detail-crm-demo",
    name: "Garage 24 Auto Care",
    location: "Кишинёв · Ботаника",
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80"
  }
];

function getMarketingDemoCompanyBySlug(slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  return marketingPartnerCards.find((item) => String(item.slug || "").trim().toLowerCase() === normalizedSlug) || null;
}

function resolvePublicCompanySlug(slug) {
  const demoCompany = getMarketingDemoCompanyBySlug(slug);
  return demoCompany?.backendSlug || String(slug || "").trim();
}

const marketingCatalogStats = [
  { value: "CRM", label: "для автоуслуг Молдовы" },
  { value: "Telegram", label: "уведомления с первого дня" },
  { value: "Фото + статус", label: "прозрачность для клиента" }
];

const marketingCatalogFilters = {
  categories: [
    "Детейлинг",
    "Автомойка",
    "Автосервис",
    "Шиномонтаж",
    "Полировка",
    "Химчистка",
    "Диагностика",
    "Замена колес"
  ],
  paymentMethods: ["Любой", "Наличные", "Карта", "Перевод"],
  cities: ["Все города", "Кишинёв", "Бельцы", "Оргеев", "Комрат", "Кагул"],
  districts: ["Центр", "Буюканы", "Ботаника", "Рышкановка", "Чеканы", "Телецентр"]
};

const marketingCatalogListings = [
  {
    name: "Crystal Detail Garage",
    city: "Кишинёв",
    district: "Центр",
    category: "Детейлинг",
    payment: "Карта",
    rating: 5,
    reviews: 128,
    badge: "Партнёр",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Urban Wash Hub",
    city: "Кишинёв",
    district: "Буюканы",
    category: "Автомойка",
    payment: "Наличные",
    rating: 5,
    reviews: 96,
    badge: "Featured",
    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Fast Lane Tire Point",
    city: "Бельцы",
    district: "Центр",
    category: "Шиномонтаж",
    payment: "Карта",
    rating: 5,
    reviews: 81,
    badge: "Партнёр",
    image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "North Bay Auto Service",
    city: "Оргеев",
    district: "Центр",
    category: "Автосервис",
    payment: "Перевод",
    rating: 5,
    reviews: 64,
    badge: "Featured",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "CleanLine Auto Spa",
    city: "Кишинёв",
    district: "Рышкановка",
    category: "Химчистка",
    payment: "Карта",
    rating: 5,
    reviews: 102,
    badge: "Партнёр",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Garage 24 Diagnostics",
    city: "Кишинёв",
    district: "Ботаника",
    category: "Диагностика",
    payment: "Перевод",
    rating: 5,
    reviews: 74,
    badge: "Партнёр",
    image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Shine Box Premium",
    city: "Комрат",
    district: "Центр",
    category: "Полировка",
    payment: "Карта",
    rating: 5,
    reviews: 59,
    badge: "Featured",
    image: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Wheel Room Express",
    city: "Кагул",
    district: "Центр",
    category: "Замена колес",
    payment: "Наличные",
    rating: 5,
    reviews: 47,
    badge: "Партнёр",
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80"
  }
];

const marketingPricingIntervals = [
  { id: "monthly", label: "1 month" },
  { id: "yearly", label: "1 year" }
];

const marketingPricingPlans = {
  monthly: [
    {
      id: "basic",
      name: "Basic",
      badge: "",
      description: "Для первого старта в каталоге и аккуратного входа в CRM.",
      price: "Free",
      oldPrice: "",
      note: "Без оплаты",
      afterNote: "Подходит, чтобы зайти в каталог и проверить первую запись.",
      featuresTitle: "Что входит",
      features: [
        "Карточка центра в каталоге",
        "До 30 заявок в месяц",
        "Неограниченные услуги",
        "Приём заявок с сайта",
        "Базовый статус машины",
        "Telegram-уведомления менеджеру"
      ],
      cta: "Выбрать пакет"
    },
    {
      id: "solo",
      name: "Solo",
      badge: "",
      description: "Для одного центра, который хочет уже не просто карточку, а рабочий контур.",
      price: "€6.25",
      oldPrice: "€12.50",
      note: "в месяц",
      afterNote: "50% на первый период, затем стандартная ставка.",
      featuresTitle: "Всё из Basic плюс",
      features: [
        "Неограниченные заявки",
        "1 пользователь в CRM",
        "Онлайн-запись 24/7",
        "Клиентская status page",
        "Telegram клиенту и команде",
        "Базовая аналитика по потоку"
      ],
      cta: "Выбрать пакет"
    },
    {
      id: "professional",
      name: "Professional",
      badge: "Popular",
      description: "Для сильного детейлинг-центра или автосервиса с командой и оплатами.",
      price: "€12.50",
      oldPrice: "€24.99",
      note: "в месяц",
      afterNote: "Сниженная стартовая цена перед полным тарифом.",
      featuresTitle: "Всё из Solo плюс",
      features: [
        "До 5 пользователей",
        "Касса и статусы оплат",
        "Фото до/после",
        "Роли и доступы команды",
        "Приоритет в каталоге",
        "Расширенная аналитика по заявкам"
      ],
      cta: "Выбрать пакет"
    }
  ],
  yearly: [
    {
      id: "basic",
      name: "Basic",
      badge: "",
      description: "Для первого старта в каталоге и аккуратного входа в CRM.",
      price: "Free",
      oldPrice: "",
      note: "Без оплаты",
      afterNote: "Можно начать без оплаты и перейти на год позже.",
      featuresTitle: "Что входит",
      features: [
        "Карточка центра в каталоге",
        "До 30 заявок в месяц",
        "Неограниченные услуги",
        "Приём заявок с сайта",
        "Базовый статус машины",
        "Telegram-уведомления менеджеру"
      ],
      cta: "Выбрать пакет"
    },
    {
      id: "solo",
      name: "Solo",
      badge: "",
      description: "Для одного центра, который хочет уже не просто карточку, а рабочий контур.",
      price: "€5.21",
      oldPrice: "€10.42",
      note: "в месяц при оплате за год",
      afterNote: "Годовая цена ниже, чем помесячное подключение.",
      featuresTitle: "Всё из Basic плюс",
      features: [
        "Неограниченные заявки",
        "1 пользователь в CRM",
        "Онлайн-запись 24/7",
        "Клиентская status page",
        "Telegram клиенту и команде",
        "Базовая аналитика по потоку"
      ],
      cta: "Выбрать пакет"
    },
    {
      id: "professional",
      name: "Professional",
      badge: "Popular",
      description: "Для сильного детейлинг-центра или автосервиса с командой и оплатами.",
      price: "€10.41",
      oldPrice: "€20.83",
      note: "в месяц при оплате за год",
      afterNote: "Годовая ставка для тех, кто уже запускает центр всерьёз.",
      featuresTitle: "Всё из Solo плюс",
      features: [
        "До 5 пользователей",
        "Касса и статусы оплат",
        "Фото до/после",
        "Роли и доступы команды",
        "Приоритет в каталоге",
        "Расширенная аналитика по заявкам"
      ],
      cta: "Выбрать пакет"
    }
  ]
};

function getStorefrontPlanConfig(planId, billingInterval = "monthly") {
  const normalizedBilling = billingInterval === "yearly" || billingInterval === "Год" ? "yearly" : "monthly";
  const plans = marketingPricingPlans[normalizedBilling] || marketingPricingPlans.monthly;
  return plans.find((plan) => plan.id === planId) || null;
}

function normalizeStorefrontBillingInterval(value) {
  return value === "yearly" || value === "Год" ? "yearly" : "monthly";
}

function parseStorefrontPlanPrice(planConfig) {
  if (!planConfig?.price || planConfig.price === "Free") {
    return null;
  }

  const parsed = Number(String(planConfig.price).replace("€", "").replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getCommercialChargeSummary(planConfig, billingInterval = "monthly", fallbackMonthlyAmount = null) {
  const normalizedBilling = normalizeStorefrontBillingInterval(billingInterval);
  const monthlyEquivalent = parseStorefrontPlanPrice(planConfig);
  const resolvedMonthlyEquivalent =
    monthlyEquivalent != null && Number.isFinite(monthlyEquivalent)
      ? monthlyEquivalent
      : fallbackMonthlyAmount != null && Number.isFinite(Number(fallbackMonthlyAmount))
      ? Number(fallbackMonthlyAmount)
      : null;
  const chargeAmount =
    resolvedMonthlyEquivalent == null
      ? null
      : normalizedBilling === "yearly"
      ? Number((resolvedMonthlyEquivalent * 12).toFixed(2))
      : resolvedMonthlyEquivalent;

  return {
    billingInterval: normalizedBilling,
    billingLabel: normalizedBilling === "yearly" ? "Год" : "Месяц",
    monthlyEquivalent: resolvedMonthlyEquivalent,
    chargeAmount,
    chargeSuffix: normalizedBilling === "yearly" ? "EUR / год" : "EUR / мес",
    chargeNote:
      normalizedBilling === "yearly"
        ? resolvedMonthlyEquivalent != null
          ? `${resolvedMonthlyEquivalent} EUR в мес. эквиваленте`
          : "Годовая сумма считается вручную"
        : null
  };
}

const manualBillingChannelLabels = {
  bank_transfer: "Перевод / IBAN",
  card_link: "Ссылка на оплату",
  cash: "Наличные",
  mixed: "Смешанный способ"
};

function formatManualBillingChannel(value) {
  return manualBillingChannelLabels[value] || "Перевод / IBAN";
}

function getLatestCommercialPayload(subscriptionEvents = []) {
  const commercialEvent = subscriptionEvents.find((event) =>
    ["manual_prepared", "invoice_sent", "payment_confirmed", "payment_paused"].includes(event?.event_type)
  );
  return commercialEvent?.payload && typeof commercialEvent.payload === "object" ? commercialEvent.payload : {};
}

function buildCommercialEventPayloadExtra(context = {}) {
  return {
    storefront_plan_id: context.storefrontPlanId || null,
    billing_period: context.billingPeriod || null,
    charge_amount:
      context.chargeAmount == null || Number.isNaN(Number(context.chargeAmount)) ? null : Number(context.chargeAmount),
    charge_suffix: context.chargeSuffix || null,
    mrr_equivalent:
      context.monthlyEquivalent == null || Number.isNaN(Number(context.monthlyEquivalent))
        ? null
        : Number(context.monthlyEquivalent),
    owner_name: context.ownerName || null,
    owner_phone: context.ownerPhone || null,
    owner_email: context.ownerEmail || null,
    payment_channel: context.paymentChannel || null,
    payment_due_at: context.paymentDueAt || null,
    payment_note: context.paymentNote || null,
    source_request_id: context.requestId || null
  };
}

function buildCommercialOperatorPackLines(context = {}, origin = "") {
  const companyLoginUrl = context.companyLoginUrl ? `${origin}${context.companyLoginUrl}` : "";
  const publicRequestUrl = context.publicRequestUrl ? `${origin}${context.publicRequestUrl}` : "";
  const ownerContact = [context.ownerName, context.ownerPhone, context.ownerEmail].filter(Boolean).join(" · ");

  return [
    `${context.companyName || "Компания"}`,
    context.businessLabel ? `Ниша: ${context.businessLabel}` : "",
    context.planLabel ? `Пакет: ${context.planLabel}` : "",
    context.billingLabel ? `Период: ${context.billingLabel}` : "",
    context.billingStatusLabel ? `Billing: ${context.billingStatusLabel}` : "",
    context.chargeAmount ? `Сумма к оплате: ${platformEurFormatter.format(context.chargeAmount)} ${context.chargeSuffix || "EUR"}` : "Сумма: уточнить вручную",
    context.monthlyEquivalent != null ? `MRR эквивалент: ${platformEurFormatter.format(context.monthlyEquivalent)} EUR / мес` : "",
    ownerContact ? `Контакт владельца: ${ownerContact}` : "Контакт владельца: уточнить вручную",
    `Способ оплаты: ${formatManualBillingChannel(context.paymentChannel)}`,
    context.paymentDueAt ? `Срок оплаты: ${formatDateTime(context.paymentDueAt)}` : "Срок оплаты: согласовать вручную",
    context.paymentNote ? `Комментарий владельцу: ${context.paymentNote}` : "",
    companyLoginUrl ? `Вход компании: ${companyLoginUrl}` : "",
    publicRequestUrl ? `Форма клиента: ${publicRequestUrl}` : "",
    "После оплаты: открыть /platform, подтвердить первую оплату и проверить active billing.",
    context.nextStep ? `Следующий шаг: ${context.nextStep}` : ""
  ].filter(Boolean);
}

function buildCommercialOwnerPackLines(context = {}, origin = "") {
  const companyLoginUrl = context.companyLoginUrl ? `${origin}${context.companyLoginUrl}` : "";
  const publicRequestUrl = context.publicRequestUrl ? `${origin}${context.publicRequestUrl}` : "";
  const ownerGreeting = context.ownerName ? `Здравствуйте, ${context.ownerName}.` : "Здравствуйте.";

  return [
    ownerGreeting,
    `Для ${context.companyName || "вашего центра"} подготовлено подключение Detail CRM.`,
    context.planLabel ? `Пакет: ${context.planLabel}` : "",
    context.billingLabel ? `Период: ${context.billingLabel}` : "",
    context.chargeAmount ? `Сумма к оплате: ${platformEurFormatter.format(context.chargeAmount)} ${context.chargeSuffix || "EUR"}` : "Сумму подтверждаем отдельно.",
    `Способ оплаты: ${formatManualBillingChannel(context.paymentChannel)}`,
    context.paymentDueAt ? `Срок оплаты: ${formatDateTime(context.paymentDueAt)}` : "",
    context.paymentNote ? `${context.paymentNote}` : "После оплаты пришлите подтверждение, и мы сразу активируем компанию и доступы команды.",
    companyLoginUrl ? `Вход компании: ${companyLoginUrl}` : "",
    publicRequestUrl ? `Форма клиента: ${publicRequestUrl}` : ""
  ].filter(Boolean);
}

const marketingBlogCategories = ["Все", "Статья", "Интервью", "Новости", "События"];

const marketingBlogPosts = [
  {
    category: "Статья",
    title: "Как детейлинг-центру поднять средний чек без лишних скидок",
    excerpt: "Разбираем, какие услуги лучше объединять в пакеты и как продавать допработы без давления на клиента.",
    date: "18.06.2026",
    views: 1284,
    image: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "Новости",
    title: "Почему автомойке выгодно вести онлайн-каталог с живыми карточками",
    excerpt: "Каталог превращает случайный трафик в записи и помогает партнёрам получать поток без лишних звонков.",
    date: "12.06.2026",
    views: 954,
    image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "Интервью",
    title: "Интервью с владельцем автоцентра: что реально спасает смену в сезон",
    excerpt: "Поговорили про загрузку мастеров, кассу, статус машины и что владельцы хотят видеть каждый день.",
    date: "08.06.2026",
    views: 731,
    image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "Статья",
    title: "Шиномонтаж без очередей: как готовить сезонную запись заранее",
    excerpt: "Простой разбор, как распределять поток по слотам и не терять клиентов в пиковые недели.",
    date: "30.05.2026",
    views: 642,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "События",
    title: "Обзор рынка автоуслуг: что сейчас лучше всего продаётся в каталоге",
    excerpt: "Смотрим, какие категории услуг привлекают больше всего заявок и как меняется спрос по городам.",
    date: "24.05.2026",
    views: 518,
    image: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "Новости",
    title: "Telegram-уведомления клиенту: почему это работает лучше звонков",
    excerpt: "Коротко о том, как уведомления о готовности машины снижают нагрузку на менеджера.",
    date: "19.05.2026",
    views: 487,
    image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80"
  }
];

const marketingProblemCards = [
  {
    number: "01",
    title: "Заявки в мессенджерах",
    text: "Заказы в Telegram, WhatsApp и Instagram разбросаны по чатам. Какая-то заявка всегда теряется."
  },
  {
    number: "02",
    title: "Клиент сам звонит",
    text: "Вместо работы команда отвечает на вопросы “что с машиной?”, потому что у клиента нет статуса."
  },
  {
    number: "03",
    title: "Деньги считаются вручную",
    text: "Непонятно, что реально приносит кассу: мойка, химчистка, полировка или полный детейлинг."
  }
];

const serviceLabels = {
  "Spalare exterioara": "Мойка кузова",
  "Curatare salon": "Химчистка салона",
  "Spalare detaliata": "Детальная мойка",
  "Detailing interior": "Детейлинг салона",
  "Polizare completa": "Полировка кузова",
  "Detailing complet": "Полный детейлинг",
  Ceramica: "Керамическое покрытие",
  "Polizare + Ceramica": "Полировка + керамика",
  "Consultatie coating ceramic": "Консультация по керамике",
  "Consultatie pentru coating ceramic": "Консультация по керамике"
};

function formatCurrency(value) {
  if (value == null || value === "") {
    return "0 лей";
  }

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(Number(value))} лей`;
}

function parsePaymentAmountInput(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsedAmount = Number(String(value).replace(",", "."));
  return Number.isFinite(parsedAmount) ? parsedAmount : Number.NaN;
}

function formatCompanyStatus(value) {
  if (value === "active") {
    return "Активна";
  }

  if (value === "paused") {
    return "На паузе";
  }

  if (value === "archived") {
    return "Архив";
  }

  return value || "Не задано";
}

function formatBillingStatus(value) {
  return billingStatusLabels[value] || value || "Не задано";
}

function formatSeatLimit(planCode) {
  const limit = planSeatLimits[planCode];
  return limit == null ? "Без лимита" : `${limit} сотрудников`;
}

function formatSubscriptionEventType(value) {
  if (value === "created") {
    return "Создана подписка";
  }
  if (value === "updated") {
    return "Обновлена подписка";
  }
  if (value === "status_changed") {
    return "Изменён статус компании";
  }
  if (value === "billing_changed") {
    return "Изменён биллинг";
  }
  if (value === "plan_changed") {
    return "Изменён тариф";
  }
  if (value === "manual_prepared") {
    return "Подготовлен manual billing";
  }
  if (value === "invoice_sent") {
    return "Счёт / реквизиты отправлены";
  }
  if (value === "payment_confirmed") {
    return "Оплата подтверждена";
  }
  if (value === "payment_paused") {
    return "Запуск остановлен без оплаты";
  }
  return value || "Изменение";
}

function formatDemoRequestStatus(value) {
  return demoRequestStatusLabels[value] || formatLabel(value) || "Новая";
}

function getPrimaryPaidActionConfig(item) {
  if (!item?.company) {
    return { key: "open_company", label: "Открыть компанию", note: "Нужно открыть компанию и принять решение вручную." };
  }

  const blockers = item.blockers || [];
  const hasBlocker = (sourceKey) => blockers.some((blocker) => blocker.sourceKey === sourceKey);
  const activeStaffMembersCount = Number(item.company.active_staff_members_count || 0);
  const servicesCount = Number(item.company.services_count || 0);

  if (item.company.status !== "active" || hasBlocker("company_status")) {
    return { key: "active", label: "Перевести в active", note: "Сначала включаем компанию как рабочую, потом дожимаем оплату." };
  }

  if (activeStaffMembersCount === 0 || hasBlocker("members")) {
    return { key: "starter_bundle", label: "Выдать starter bundle", note: "Сначала нужен хотя бы manager или master, чтобы запуск не висел на одном owner." };
  }

  if (servicesCount === 0 || hasBlocker("services")) {
    return { key: "service_pack", label: "Загрузить услуги", note: "Без пакета услуг компания зависнет даже если billing уже почти закрыт." };
  }

  if (item.commercialStage === "invoice_sent") {
    return { key: "confirm_paid", label: "Подтвердить оплату", note: "Счёт уже отправлен, дальше не тянем и закрываем первую оплату." };
  }

  if (item.commercialStage === "manual_prepared") {
    return { key: "invoice_sent", label: "Отметить счёт отправленным", note: "Manual billing уже собран, следующий шаг только отправить счёт владельцу." };
  }

  if (item.readyPackEligible) {
    return {
      key: item.manualBillingRecommended ? "full_manual" : "ready_pack",
      label: item.manualBillingRecommended ? "Full manual" : "Ready pack",
      note: item.manualBillingRecommended
        ? "Компания уже близко, можно закрыть типовой запуск одной creator-пачкой."
        : "Остались только типовые шаги, их лучше закрыть одним пакетом."
    };
  }

  if (item.commercialStage === "payment_paused") {
    return { key: "prepare_manual", label: "Вернуть в manual", note: "Компания зависла после паузы, сначала возвращаем её в понятный manual billing шаг." };
  }

  if (item.commercialStage === "not_started" || hasBlocker("billing")) {
    return { key: "prepare_manual", label: "Подготовить manual billing", note: "Это первый коммерческий шаг, после него уже можно отправлять счёт владельцу." };
  }

  return { key: "open_company", label: "Открыть компанию", note: item.nextStep || "Нужно открыть компанию и посмотреть детали." };
}

function selectFirstPaidLaunchCandidate(rows = []) {
  const candidates = (rows || [])
    .filter((item) => !item.paidReady)
    .slice()
    .sort((left, right) => {
      const leftScore =
        (!left.company.is_demo ? 1000 : 0) +
        (left.readyPackEligible ? 100 : 0) +
        (left.commercialStage === "invoice_sent" ? 60 : 0) +
        (left.commercialStage === "manual_prepared" ? 35 : 0) +
        (left.manualBillingRecommended ? 40 : 0) +
        (left.readiness === "almost_ready" ? 20 : 0) -
        left.blockers.length;
      const rightScore =
        (!right.company.is_demo ? 1000 : 0) +
        (right.readyPackEligible ? 100 : 0) +
        (right.commercialStage === "invoice_sent" ? 60 : 0) +
        (right.commercialStage === "manual_prepared" ? 35 : 0) +
        (right.manualBillingRecommended ? 40 : 0) +
        (right.readiness === "almost_ready" ? 20 : 0) -
        right.blockers.length;

      return (
        rightScore - leftScore ||
        left.goLive.unresolvedCount - right.goLive.unresolvedCount ||
        getComparableDate(right.company.created_at) - getComparableDate(left.company.created_at)
      );
    });

  return candidates[0] || null;
}

function formatStorefrontPlanLabel(value) {
  if (!value) {
    return "Не выбран";
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "basic") {
    return "Basic";
  }

  if (normalized === "solo") {
    return "Solo";
  }

  if (normalized === "professional") {
    return "Professional";
  }

  return value;
}

const demoClientLabels = {
  "Simplified Flow Client": "Клиент с быстрой заявки",
  "Public Demo Client": "Клиент с сайта",
  "Baseline Check Client": "Контрольный клиент"
};

function formatClientName(value) {
  if (!value) {
    return "Клиент";
  }

  return demoClientLabels[value] || value;
}

function formatDate(value) {
  if (!value) {
    return "Не задано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function isSameCalendarDay(leftValue, rightValue) {
  if (!leftValue || !rightValue) {
    return false;
  }

  const left = new Date(leftValue);
  const right = new Date(rightValue);

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getLeadQueueTime(lead) {
  if (lead.follow_up_at) {
    return getComparableDate(lead.follow_up_at);
  }

  if (lead.preferred_date) {
    const composedValue = `${lead.preferred_date}T${lead.preferred_time || "00:00:00"}`;
    return getComparableDate(composedValue);
  }

  return getComparableDate(lead.created_at);
}

function formatDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDemoRequestFollowUpState(value) {
  if (value === "overdue") {
    return "Просрочен";
  }

  if (value === "today") {
    return "Сегодня";
  }

  if (value === "soon") {
    return "Скоро";
  }

  if (value === "scheduled") {
    return "Запланирован";
  }

  return "Не задан";
}

function getInvoiceDueState(daysLeft) {
  if (daysLeft == null) {
    return "none";
  }

  if (daysLeft < 0) {
    return "overdue";
  }

  if (daysLeft === 0) {
    return "today";
  }

  if (daysLeft <= 3) {
    return "soon";
  }

  return "scheduled";
}

function getNextIsoOffset(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function formatLabel(value) {
  if (!value) {
    return "Не задано";
  }

  if (sourceLabels[value]) {
    return sourceLabels[value];
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatServiceName(value) {
  if (!value) {
    return "Не выбрана";
  }

  return serviceLabels[value] || value;
}

function getLeadAmount(lead) {
  if (!lead) {
    return 0;
  }

  const explicitAmount = Number(lead.estimated_price || 0);
  if (Number.isFinite(explicitAmount) && explicitAmount > 0) {
    return explicitAmount;
  }

  const serviceAmount = Number(lead.services?.base_price || 0);
  if (Number.isFinite(serviceAmount) && serviceAmount > 0) {
    return serviceAmount;
  }

  return 0;
}

function getLeadPaidAmount(lead) {
  if (!lead) {
    return 0;
  }

  const paidAmount = Number(lead.paid_amount || 0);
  if (Number.isFinite(paidAmount) && paidAmount > 0) {
    return paidAmount;
  }

  if (lead.payment_status === "paid") {
    return getLeadAmount(lead);
  }

  return 0;
}

function getLeadOutstandingAmount(lead) {
  const totalAmount = getLeadAmount(lead);
  const paidAmount = getLeadPaidAmount(lead);
  return Math.max(totalAmount - paidAmount, 0);
}

function formatLeadPaymentSummary(lead) {
  const statusLabel = paymentStatusLabels[lead?.payment_status] || "Не оплачено";
  const paidAmount = getLeadPaidAmount(lead);
  const outstandingAmount = getLeadOutstandingAmount(lead);

  if (lead?.payment_status === "paid" && paidAmount > 0) {
    return `${statusLabel} · ${formatCurrency(paidAmount)}`;
  }

  if (lead?.payment_status === "partial" && paidAmount > 0) {
    return `${statusLabel} · внесено ${formatCurrency(paidAmount)}${outstandingAmount > 0 ? `, остаток ${formatCurrency(outstandingAmount)}` : ""}`;
  }

  return statusLabel;
}

function getRangeStart(date, rangeKey) {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);

  if (rangeKey === "day") {
    return base;
  }

  if (rangeKey === "week") {
    const day = base.getDay();
    const offset = day === 0 ? 6 : day - 1;
    base.setDate(base.getDate() - offset);
    return base;
  }

  if (rangeKey === "month") {
    base.setDate(1);
    return base;
  }

  if (rangeKey === "year") {
    base.setMonth(0, 1);
    return base;
  }

  return base;
}

function isDateInRange(value, rangeStart, rangeEnd) {
  const timestamp = getComparableDate(value);
  return timestamp >= rangeStart.getTime() && timestamp <= rangeEnd.getTime();
}

function formatStatusName(value) {
  return formatStatusLabel(value);
}

function formatEventNote(note, payload, type) {
  if (!note) {
    return "Без дополнительного комментария.";
  }

  const normalized = note.trim();

  if (normalized === "Alerta Telegram pentru solicitare a fost trimisa managerului.") {
    return "Уведомление в Телеграм по заявке отправлено менеджеру.";
  }

  if (normalized === "Reminderul Telegram pentru follow-up a fost trimis managerului.") {
    return "Напоминание в Телеграм по следующему контакту отправлено менеджеру.";
  }

  if (normalized === "Lead created from landing") {
    return "Заявка создана из канала Лендинг.";
  }

  if (normalized.startsWith("Lead created from ")) {
    const source = normalized.slice("Lead created from ".length).trim();
    return `Заявка создана из канала ${formatLabel(source)}.`;
  }

  if (normalized.startsWith("Solicitare creata din sursa ")) {
    const source = normalized.slice("Solicitare creata din sursa ".length).trim().toLowerCase();
    return `Заявка создана из канала ${formatLabel(source)}.`;
  }

  if (normalized.startsWith("Status changed from ")) {
    const match = normalized.match(/^Status changed from ([\w_]+) to ([\w_]+)$/i);
    if (match) {
      return `Статус изменён с "${formatStatusName(match[1].toLowerCase())}" на "${formatStatusName(match[2].toLowerCase())}"`;
    }
  }

  if (normalized.startsWith("Follow-up set for ")) {
    const dateValue = normalized.slice("Follow-up set for ".length).trim();
    return `Следующий контакт назначен на ${formatDate(dateValue)}`;
  }

  if (normalized === "Follow-up cleared") {
    return "Следующий контакт очищен.";
  }

  if (normalized === "Quote sent for full exterior refresh package.") {
    return "Клиенту отправлено предложение по полному пакету обновления кузова.";
  }

  if (normalized === "Status schimbat din nou in ofertat") {
    return "Статус изменён с \"Новая\" на \"Предложение\"";
  }

  if (normalized === "Oferta a fost trimisa pentru pachetul complet de reconditionare exterioara.") {
    return "Клиенту отправлено предложение по полному пакету восстановления кузова.";
  }

  if (normalized === "Follow-up programat pentru maine dupa-amiaza.") {
    return "Следующий контакт назначен на завтра после обеда.";
  }

  if (type === "created" && payload?.source) {
    return `Заявка создана из канала ${formatLabel(payload.source)}.`;
  }

  return normalized;
}

function normalizePhone(value) {
  return (value || "").replace(/[^\d+]/g, "");
}

function getWhatsAppUrl(phone) {
  const digits = normalizePhone(phone).replace(/^\+/, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

function slugifyCompanyName(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/[а-яё]/gi, "");
}

function makeUniqueCompanySlug(value, companies = []) {
  const normalized = slugifyCompanyName(value) || "company";
  const usedSlugs = new Set((companies || []).map((company) => String(company.slug || "").trim().toLowerCase()).filter(Boolean));

  if (!usedSlugs.has(normalized)) {
    return normalized;
  }

  let suffix = 2;
  let candidate = `${normalized}-${suffix}`;
  while (usedSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${normalized}-${suffix}`;
  }

  return candidate;
}

function mergeTeamProfiles(memberships, profiles) {
  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return (memberships || []).map((membership) => {
    const profile = profilesById.get(membership.user_id) || {};

    return {
      ...profile,
      id: membership.user_id,
      membership_id: membership.id,
      company_id: membership.company_id,
      role: membership.role || "manager",
      is_active: membership.is_active !== false,
      membership_created_at: membership.created_at || null,
      email: profile.email || ""
    };
  });
}

function formatTeamMemberLabel(member, fallback = "Сотрудник") {
  if (!member) {
    return fallback;
  }

  return member.full_name || member.email || roleLabels[member.role] || fallback;
}

function createInviteSupabaseClient() {
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function buildPlatformStarterCredentials(company, role) {
  const baseSlug = slugifyCompanyName(company?.slug || company?.name || "company");
  const suffix = Date.now().toString().slice(-6);
  const roleAlias = role === "owner" ? "owner" : role === "manager" ? "manager" : "master";

  return {
    role,
    full_name: `${company?.name || "Company"} ${roleLabels[role] || "Сотрудник"}`.trim(),
    email: `${baseSlug}.${roleAlias}.${suffix}@detailcrm.app`,
    password: `DetailCRM26!${suffix}`,
    telegram_chat_id: ""
  };
}

function resolveRequestStarterRoles(request, commerceSnapshot = {}, billingPeriod = "monthly") {
  const requestedRole = String(commerceSnapshot.role || "").trim().toLowerCase();
  const rawTeamSize = Number(commerceSnapshot.teamSize || request?.employees_count || 0);
  const teamSize = Number.isFinite(rawTeamSize) ? rawTeamSize : 0;
  const roles = new Set(["owner"]);

  if (billingPeriod === "free_month" || teamSize >= 2 || requestedRole === "manager") {
    roles.add("manager");
  }

  if (billingPeriod === "free_month" || teamSize >= 3 || requestedRole === "detailer" || requestedRole === "master") {
    roles.add("detailer");
  }

  return ["owner", "manager", "detailer"].filter((role) => roles.has(role));
}

function formatPreferredSlot(dateValue, timeValue) {
  if (!dateValue) {
    return "Не указан";
  }

  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium"
  }).format(new Date(`${dateValue}T00:00:00`));

  return `${formattedDate}${timeValue ? `, ${timeValue}` : ""}`;
}

function getRolePermissions(role) {
  return rolePermissions[role] || rolePermissions.manager;
}

function getRoleAccessSummary(role) {
  if (role === "owner") {
    return "Полный доступ к системе, команде, настройкам и автоматизациям.";
  }

  if (role === "detailer") {
    return "Видит только назначенные заявки и рабочую историю клиента.";
  }

  return "Управляет заявками, клиентами и задачами без доступа к системным настройкам.";
}

function CompanyOnboardingPage({ userEmail, saving, onCreateCompany }) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    business_type: "detailing",
    contact_phone: "",
    contact_email: userEmail || ""
  });

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => {
      if (name === "name") {
        const nextSlug = current.slug ? current.slug : slugifyCompanyName(value);
        return {
          ...current,
          name: value,
          slug: nextSlug
        };
      }

      return {
        ...current,
        [name]: value
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreateCompany(form);
  }

  return (
    <div className="auth-shell">
      <div className="auth-split">
        <section className="auth-main-card">
          <LogoWordmark />
          <div className="auth-copy">
            <h1>Создайте первую компанию</h1>
            <p>Подключим рабочее пространство, чтобы CRM, заявки и витрина уже работали внутри вашей компании.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Название компании
              <input name="name" value={form.name} onChange={updateField} placeholder="Например, Премиум центр" required />
            </label>

            <label>
              Код компании
              <input
                name="slug"
                value={form.slug}
                onChange={updateField}
                placeholder="например: код-компании"
                required
              />
            </label>

            <label>
              Тип бизнеса
              <select name="business_type" value={form.business_type} onChange={updateField}>
                <option value="detailing">Детейлинг</option>
                <option value="car_wash">Автомойка</option>
                <option value="tire_service">Шиномонтаж</option>
                <option value="auto_service">Автосервис</option>
              </select>
            </label>

            <label>
              Телефон
              <input name="contact_phone" value={form.contact_phone} onChange={updateField} placeholder="+373..." />
            </label>

            <label>
              Почта
              <input name="contact_email" type="email" value={form.contact_email} onChange={updateField} placeholder="почта@центр.md" />
            </label>

            <button type="submit" className="button button-primary button-full" disabled={saving}>
              {saving ? "Создаём компанию..." : "Создать компанию"}
            </button>
          </form>
        </section>

        <aside className="auth-side-card">
          <div className="auth-side-top">
            <LogoWordmark inverse />
          </div>
          <div className="auth-side-quote">
            <p>После создания компании мы сразу закрепим вас как владельца и откроем полноценный рабочий кабинет.</p>
            <span>Первый шаг в multi-company SaaS режиме</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function getInitialLeadForm(services) {
  return {
    client_name: "",
    phone: "",
    email: "",
    car_make: "",
    car_model: "",
    car_year: "",
    car_plate: "",
    service_id: services[0]?.id || "",
    source: "manual",
    address: "",
    comment: "",
    preferred_date: "",
    preferred_time: "",
    estimated_price: "",
    follow_up_at: ""
  };
}

function getInitials(value) {
  if (!value) {
    return "КЛ";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return /[A-Z]/.test(initials) ? "КЛ" : initials || "КЛ";
}

function getLeadStageKey(status) {
  if (["new", "accepted"].includes(status)) {
    return "new";
  }

  if (["done", "paid"].includes(status)) {
    return "done";
  }

  if (status === "delivered") {
    return "delivered";
  }

  if (status === "lost") {
    return "lost";
  }

  return "in_progress";
}

function isStageHighlighted(stageKey) {
  return stageKey === "in_progress";
}

function Avatar({ name, large = false }) {
  return (
    <span className={large ? "avatar avatar-large" : "avatar"}>
      {getInitials(name)}
    </span>
  );
}

function StatusBadge({ status, businessType = "detailing" }) {
  const group = getLeadStageKey(status);
  return (
    <span className={`status-badge status-group-${group}`}>
      {formatStatusLabel(status, businessType)}
    </span>
  );
}

function MiniIcon({ label, accent = false, variant = "" }) {
  const className = [accent ? "mini-icon accent" : "mini-icon", variant ? `mini-icon-${variant}` : ""].filter(Boolean).join(" ");
  return <span className={className}>{label}</span>;
}

function LogoWordmark({ inverse = false }) {
  return (
    <div className={inverse ? "logo-wordmark inverse" : "logo-wordmark"}>
      <img src={detailLogo} alt="Логотип детейлинга" className="logo-mark" />
      <div className="logo-copy">
        <strong>Детейлинг</strong>
      </div>
    </div>
  );
}

function getPublicStatusSteps(status) {
  const normalizedStatus = ({
    accepted: "contacted",
    diagnostics: "quoted",
    approval: "quoted",
    waiting_client: "scheduled",
    waiting_payment: "done",
    paid: "done",
    delivered: "delivered"
  })[status] || status || "new";
  const sequence = ["new", "contacted", "quoted", "scheduled", "in_progress", "done", "delivered"];
  const currentIndex = Math.max(sequence.indexOf(normalizedStatus), 0);
  return [
    { key: "contacted", label: "Принято", done: currentIndex >= 1, active: currentIndex <= 1 },
    { key: "quoted", label: "Осмотр / приёмка / согласование", done: currentIndex >= 2, active: currentIndex === 2 },
    { key: "scheduled", label: "Запланировано / ждём клиента", done: currentIndex >= 3, active: currentIndex === 3 },
    { key: "in_progress", label: "В работе", done: currentIndex >= 4, active: currentIndex === 4 },
    { key: "done", label: "Готово к выдаче", done: currentIndex >= 5, active: currentIndex === 5 },
    { key: "delivered", label: "Выдана", done: currentIndex >= 6, active: currentIndex >= 6 }
  ];
}

const photoStageLabels = {
  before: "До",
  after: "После"
};

function PublicCompanyPage() {
  const location = useLocation();
  const cleanSlug = useMemo(() => {
    const parts = String(location.pathname || "")
      .split("/")
      .filter(Boolean);

    if (parts[0] !== "s" || !parts[1]) {
      return "";
    }

    return decodeURIComponent(parts[1]).trim();
  }, [location.pathname]);
  const demoCompanyMeta = useMemo(() => getMarketingDemoCompanyBySlug(cleanSlug), [cleanSlug]);
  const effectiveCompanySlug = useMemo(() => resolvePublicCompanySlug(cleanSlug), [cleanSlug]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [company, setCompany] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadCompanyPage() {
      setLoading(true);
      setError("");
      setCompany(null);
      setServices([]);
      setReviews([]);

      if (!cleanSlug) {
        setError("Страница компании не найдена.");
        setLoading(false);
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, name, slug, business_type, status, contact_phone, contact_email")
        .eq("slug", effectiveCompanySlug)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (companyError || !companyData?.id || companyData.status !== "active") {
        setError("Эта страница сейчас недоступна.");
        setLoading(false);
        return;
      }

      setCompany(
        demoCompanyMeta
          ? {
              ...companyData,
              name: demoCompanyMeta.name,
              slug: cleanSlug,
              location: demoCompanyMeta.location,
              hero_image: demoCompanyMeta.image
            }
          : companyData
      );

      const [{ data: servicesData, error: servicesError }, { data: reviewsData, error: reviewsError }] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, base_price, duration_minutes")
          .eq("company_id", companyData.id)
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from("company_reviews")
          .select("id, rating, comment, created_at")
          .eq("company_id", companyData.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(6)
      ]);

      if (!active) {
        return;
      }

      if (servicesError) {
        setError(servicesError.message || "Не удалось загрузить услуги.");
      } else {
        setServices(servicesData || []);
      }

      if (!reviewsError) {
        setReviews(reviewsData || []);
      }

      setLoading(false);
    }

    loadCompanyPage();

    return () => {
      active = false;
    };
  }, [cleanSlug, demoCompanyMeta, effectiveCompanySlug]);

  const businessType = company?.business_type || "detailing";
  const publicCopy = publicBusinessTypeContent[businessType] || publicBusinessTypeContent.detailing;
  const requestUrl = cleanSlug ? `/request?company_slug=${encodeURIComponent(cleanSlug)}` : "/request";
  const averageRating = reviews.length
    ? (reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : "";

  return (
    <div className="public-shell">
      <PublicInstallHint />
      <section className="public-company-page">
        <div className="public-company-nav">
          <NavLink to="/" className="auth-backlink">Вернуться на главную</NavLink>
          <LogoWordmark />
        </div>

        {loading ? <div className="surface-card">Загружаем страницу компании...</div> : null}
        {error ? <div className="notice notice-error">{error}</div> : null}

        {!loading && !error && company ? (
          <div className="page-stack">
            <section className="public-company-hero">
              <div>
                <span className="eyebrow">{businessTypeLabels[businessType] || "Автосервис"}</span>
                <h1>{company.name}</h1>
                <p>{publicCopy.description}</p>
                <div className="public-company-actions">
                  <NavLink to={requestUrl} className="button button-primary">
                    Записаться
                  </NavLink>
                  {company.contact_phone ? (
                    <a className="button button-outline" href={`tel:${company.contact_phone}`}>
                      Позвонить
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="public-company-score-card">
                <span>Страница сервиса</span>
                <strong>{averageRating || "Новый партнёр"}</strong>
                <p>{reviews.length ? `${reviews.length} отзывов после реальных заказов` : "Отзывы появятся после завершённых работ."}</p>
              </div>
            </section>

            <section className="public-company-strip">
              <article>
                <strong>Онлайн-заявка</strong>
                <span>Клиент оставляет запрос с телефона.</span>
              </article>
              <article>
                <strong>Статус по ссылке</strong>
                <span>Видно этап, фото и готовность.</span>
              </article>
              <article>
                <strong>Повторный визит</strong>
                <span>Команда не теряет клиента после выдачи.</span>
              </article>
            </section>

            <section className="surface-card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">Услуги</span>
                  <h2>Что можно заказать</h2>
                </div>
              </div>
              {services.length ? (
                <div className="public-service-grid">
                  {services.map((service) => (
                    <article key={service.id} className="public-service-card">
                      <strong>{formatServiceName(service.name)}</strong>
                      <span>{service.base_price ? `от ${formatCurrency(service.base_price)}` : "Цена уточняется"}</span>
                      <NavLink to={requestUrl} className="button button-outline">
                        Выбрать
                      </NavLink>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="timeline-empty">Услуги скоро появятся на странице.</div>
              )}
            </section>

            <section className="surface-card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">Отзывы</span>
                  <h2>Что говорят клиенты</h2>
                </div>
              </div>
              {reviews.length ? (
                <div className="public-review-grid">
                  {reviews.map((review) => (
                    <article key={review.id} className="public-review-card">
                      <strong>{"★".repeat(Number(review.rating || 0))}</strong>
                      <p>{review.comment || "Клиент оставил оценку после завершения работы."}</p>
                      <small>{formatDate(review.created_at)}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="timeline-empty">Первые отзывы появятся после закрытых заявок.</div>
              )}
            </section>

            <section className="public-company-final-cta">
              <div>
                <span className="eyebrow">Запись</span>
                <h2>Оставьте заявку, а команда подтвердит детали</h2>
              </div>
              <NavLink to={requestUrl} className="button button-primary">
                Открыть форму записи
              </NavLink>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PublicStatusPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusData, setStatusData] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      if (!token) {
        setError("Ссылка статуса неполная.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const { data, error: rpcError } = await supabase.rpc("get_public_lead_status", {
        p_token: token
      });

      if (!active) {
        return;
      }

      if (rpcError) {
        setError("Страница статуса не найдена или ссылка устарела.");
        setStatusData(null);
      } else {
        setStatusData(data);
      }

      setLoading(false);
    }

    loadStatus();

    return () => {
      active = false;
    };
  }, [token]);

  const lead = statusData?.lead || null;
  const client = statusData?.client || null;
  const attachments = statusData?.attachments || [];
  const events = statusData?.events || [];
  const steps = getPublicStatusSteps(lead?.status);
  const telegramConnectUrl = lead?.public_status_token
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-telegram-link?token=${lead.public_status_token}`
    : "";
  const groupedAttachments = {
    before: attachments.filter((attachment) => (attachment.photo_stage || "after") === "before"),
    after: attachments.filter((attachment) => (attachment.photo_stage || "after") === "after")
  };
  const latestEvent = [...events].sort((left, right) => getComparableDate(right.created_at) - getComparableDate(left.created_at))[0] || null;
  const visiblePhotoCount = attachments.length;
  const businessType = lead?.business_type || "detailing";
  const publicStatusGuidance = getPublicStatusSummaryGuidance(lead?.status);
  const statusUrl = lead?.public_status_token ? `${window.location.origin}/status/${lead.public_status_token}` : "";
  const contactPhone = client?.phone || "";
  const existingReview = statusData?.review || null;
  const canLeaveReview = Boolean(lead && ["done", "paid", "delivered"].includes(lead.status));
  const customerSummaryItems = [
    { label: "Сервис", value: lead?.company_name || "Detail CRM partner" },
    { label: "Услуга", value: formatServiceName(lead?.service_name) },
    { label: "Мастер", value: lead?.assigned_detailer_name || "Назначается" },
    { label: "Статус", value: formatStatusLabel(lead?.status, businessType) },
    { label: "Сумма", value: lead?.estimated_price ? formatCurrency(Number(lead.estimated_price)) : "Уточняется" },
    { label: "Оплата", value: formatLeadPaymentSummary(lead) }
  ];
  const agreedWorkItems = [
    formatServiceName(lead?.service_name),
    lead?.comment ? `Комментарий: ${lead.comment}` : "",
    lead?.preferred_date || lead?.preferred_time ? `Слот: ${formatPreferredSlot(lead?.preferred_date, lead?.preferred_time)}` : "",
    lead?.address ? `Адрес: ${lead.address}` : ""
  ].filter(Boolean);

  async function handlePublicReviewSubmit(event) {
    event.preventDefault();
    setReviewSaving(true);
    setReviewMessage("");
    setError("");

    try {
      const review = await submitPublicReview(supabase, token, reviewRating, reviewComment);
      setStatusData((current) => ({
        ...current,
        review
      }));
      setReviewMessage("Спасибо. Отзыв сохранён и появится на странице сервиса.");
    } catch (reviewError) {
      setError(reviewError.message || "Не удалось сохранить отзыв.");
    } finally {
      setReviewSaving(false);
    }
  }

  return (
    <div className="public-shell">
      <PublicInstallHint />
      <section className="public-status-card">
        <div className="public-status-hero">
          <LogoWordmark />
          <span className="eyebrow">Статус заявки</span>
          <h1>{formatClientName(client?.name) || "Статус автомобиля"}</h1>
          <p>
            Следите за этапом работы без звонков. Как только команда обновит статус, это сразу появится здесь.
          </p>
        </div>

        {loading ? <div className="surface-card">Загружаем статус заявки...</div> : null}
        {error ? <div className="notice notice-error">{error}</div> : null}

        {!loading && !error && lead ? (
          <div className="page-stack">
            <section className="surface-card public-status-explainer-card">
              <div className="section-title compact">
                <div>
                  <span className="eyebrow">Что это за страница</span>
                  <h2>Открывайте её в любой момент</h2>
                </div>
              </div>
              <p>Здесь видно, что происходит с машиной: этап работы, фото до/после, согласованные услуги и ориентир по сумме. Страницу можно открыть позже по той же ссылке.</p>
            </section>

            <section className="public-status-summary-grid">
              <article className="public-status-summary-card">
                <span>Текущий этап</span>
                <strong>{formatStatusLabel(lead.status, businessType)}</strong>
              </article>
              <article className="public-status-summary-card">
                <span>Услуга</span>
                <strong>{formatServiceName(lead.service_name)}</strong>
              </article>
              <article className="public-status-summary-card">
                <span>Фото по работе</span>
                <strong>{visiblePhotoCount ? `${visiblePhotoCount} шт.` : "Пока нет"}</strong>
              </article>
              <article className="public-status-summary-card">
                <span>Последнее обновление</span>
                <strong>{latestEvent ? formatDate(latestEvent.created_at) : "Ожидается"}</strong>
              </article>
            </section>

            <section className="surface-card">
              <div className="client-hero">
                <div className="client-hero-main">
                  <Avatar name={formatClientName(client?.name) || "Клиент"} large />
                  <div>
                    <span className="eyebrow">Ваш автомобиль</span>
                    <h2>{[client?.car_make, client?.car_model, client?.car_year].filter(Boolean).join(" ") || "Автомобиль уточняется"}</h2>
                    <p>{client?.car_plate || "Номер пока не указан"}</p>
                  </div>
                </div>
                <div className="client-hero-actions">
                  <StatusBadge status={lead.status} businessType={businessType} />
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-card-item">
                  <span>Услуга</span>
                  <strong>{formatServiceName(lead.service_name)}</strong>
                </div>
                <div className="detail-card-item">
                  <span>Этап</span>
                  <strong>{formatStatusLabel(lead.status, businessType)}</strong>
                </div>
                <div className="detail-card-item">
                  <span>Мастер</span>
                  <strong>{lead.assigned_detailer_name || "Назначается"}</strong>
                </div>
                <div className="detail-card-item">
                  <span>Дата заявки</span>
                  <strong>{formatDate(lead.created_at)}</strong>
                </div>
                <div className="detail-card-item">
                  <span>Сумма</span>
                  <strong>{lead.estimated_price ? formatCurrency(Number(lead.estimated_price)) : "Уточняется"}</strong>
                </div>
                <div className="detail-card-item">
                  <span>Оплата</span>
                  <strong>{formatLeadPaymentSummary(lead)}</strong>
                </div>
              </div>
            </section>

            <section className="surface-card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">Что согласовано</span>
                  <h2>Работы и ориентиры по заказу</h2>
                </div>
              </div>
              <div className="public-status-info-grid">
                {customerSummaryItems.map((item) => (
                  <article key={item.label} className="public-status-info-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
              <div className="public-status-agreed-list">
                {agreedWorkItems.map((item) => (
                  <div key={item} className="public-status-agreed-item">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">Прогресс</span>
                  <h2>Ход работы</h2>
                </div>
              </div>

              <div className="public-status-steps">
                {steps.map((step) => (
                  <article
                    key={step.key}
                    className={step.active ? "public-status-step active" : step.done ? "public-status-step done" : "public-status-step"}
                  >
                    <span className="public-status-step-mark">{step.done ? "✓" : step.active ? "•" : "○"}</span>
                    <strong>{step.label}</strong>
                  </article>
                ))}
              </div>

              <div className="pipeline-guidance-box public-guidance-box">
                <div className="pipeline-guidance-item">
                  <small>Что происходит сейчас</small>
                  <strong>{publicStatusGuidance.title}</strong>
                  <span>{publicStatusGuidance.text}</span>
                </div>
              </div>
            </section>

            <section className="surface-card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">Уведомления</span>
                  <h2>Telegram</h2>
                </div>
              </div>

              {client?.telegram_connected ? (
                <div className="detail-card-item block">
                  <p>Telegram уже подключён. Когда автомобиль будет готов, сообщение придёт прямо в чат.</p>
                </div>
              ) : (
                <div className="detail-card-item block">
                  <p>Подключите Telegram, чтобы получить сообщение, когда автомобиль будет готов.</p>
                  <a className="button button-primary" href={telegramConnectUrl} target="_blank" rel="noreferrer">
                    Подключить Telegram
                  </a>
                </div>
              )}
            </section>

            <section className="public-status-cta-card">
              <div>
                <span className="eyebrow">Коротко</span>
                <h2>{formatStatusLabel(lead.status, businessType)}</h2>
                <p>
                  {client?.telegram_connected
                    ? "Telegram уже подключён. Как только машина будет готова, сообщение придёт автоматически."
                    : "Подключение Telegram доступно в блоке уведомлений выше."}
                </p>
              </div>
              <div className="public-status-cta-actions">
                {contactPhone ? (
                  <>
                    <a className="button button-outline" href={`tel:${contactPhone}`}>
                      Позвонить
                    </a>
                    <a className="button button-outline" href={getWhatsAppUrl(contactPhone)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </>
                ) : null}
              </div>
            </section>

            <section className="surface-card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">Фото</span>
                  <h2>До и после</h2>
                </div>
              </div>

              {attachments.length ? (
                <div className="page-stack">
                  {["before", "after"].map((stageKey) =>
                    groupedAttachments[stageKey].length ? (
                      <div key={stageKey}>
                        <div className="section-title compact">
                          <h3>{photoStageLabels[stageKey]}</h3>
                        </div>
                        <div className="public-photo-grid">
                          {groupedAttachments[stageKey].map((attachment) => (
                            <article key={attachment.id} className="public-photo-card">
                              <img src={attachment.file_url} alt={`Фото: ${photoStageLabels[stageKey]}`} className="public-photo-image" />
                              <small>{formatDate(attachment.created_at)}</small>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <div className="timeline-empty">Фото появятся здесь, как только команда добавит материалы по работе.</div>
              )}
            </section>

            <section className="surface-card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">История</span>
                  <h2>Последние обновления</h2>
                </div>
              </div>

              <div className="timeline-column">
                {events.length ? (
                  events.map((item) => <TimelineEvent key={item.id} item={item} currentUserName={item.created_by_name || "Команда"} />)
                ) : (
                  <div className="timeline-empty">Обновления появятся здесь по мере движения заявки.</div>
                )}
              </div>
            </section>

            <section className="surface-card public-review-section">
              <div className="section-title">
                <div>
                  <span className="eyebrow">После выдачи</span>
                  <h2>Отзыв и повторный визит</h2>
                </div>
              </div>

              {existingReview ? (
                <div className="public-review-thanks">
                  <strong>{"★".repeat(Number(existingReview.rating || 0))}</strong>
                  <p>{existingReview.comment || "Спасибо за оценку. Команда видит обратную связь."}</p>
                </div>
              ) : canLeaveReview ? (
                <form className="public-review-form" onSubmit={handlePublicReviewSubmit}>
                  <label>
                    Оценка
                    <select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} из 5
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Комментарий
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      rows="3"
                      placeholder="Что понравилось в работе сервиса?"
                    />
                  </label>
                  <button type="submit" className="button button-primary" disabled={reviewSaving}>
                    {reviewSaving ? "Сохраняем..." : "Оставить отзыв"}
                  </button>
                  {reviewMessage ? <p className="status-note success">{reviewMessage}</p> : null}
                </form>
              ) : (
                <div className="timeline-empty">Отзыв откроется после завершения работы. Команда сможет заранее поставить следующий контакт для повторного визита.</div>
              )}
            </section>

            {statusUrl ? (
              <section className="surface-card public-status-link-card">
                <div className="section-title compact">
                  <div>
                    <span className="eyebrow">Ссылка статуса</span>
                    <h2>Эту страницу можно открыть позже</h2>
                  </div>
                </div>
                <div className="public-status-link-row">
                  <input readOnly value={statusUrl} />
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PublicInstallHint() {
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isTelegramBrowser, setIsTelegramBrowser] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    const ua = window.navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const telegram = /Telegram/i.test(ua);

    setIsStandalone(Boolean(standalone));
    setIsIos(ios);
    setIsTelegramBrowser(telegram);
  }, []);

  if (dismissed || isStandalone) {
    return null;
  }

  return (
    <section className="public-install-hint">
      <div>
        <span className="eyebrow">Установка на телефон</span>
        <h2>Можно добавить как приложение</h2>
        {isTelegramBrowser ? (
          <p>Сейчас страница открыта внутри Telegram. Для установки сначала откройте её в Safari, затем нажмите “Поделиться” и выберите “На экран Домой”.</p>
        ) : isIos ? (
          <p>На iPhone установка делается через Safari: нажмите “Поделиться” и выберите “На экран Домой”. После этого страница откроется как приложение.</p>
        ) : (
          <p>Откройте меню браузера и выберите “Установить приложение” или “Добавить на главный экран”, чтобы сохранить Detail CRM на телефоне.</p>
        )}
      </div>
      <button type="button" className="button button-outline" onClick={() => setDismissed(true)}>
        Понятно
      </button>
    </section>
  );
}

function LoginPage({ onAuthenticated }) {
  const loginShowcaseImage =
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80";
  const location = useLocation();
  const queryCompanySlug = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("company_slug")?.trim() || "";
  }, [location.search]);
  const [mode, setMode] = useState("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [companyInfo, setCompanyInfo] = useState(null);
  const companyStatusHint = companyInfo ? companyStatusAccessHints[companyInfo.status] || null : null;
  const isCompanyInactive = Boolean(companyInfo && companyInfo.status && companyInfo.status !== "active");

  useEffect(() => {
    let active = true;

    async function loadCompanyInfo() {
      if (!queryCompanySlug) {
        setCompanyInfo(null);
        return;
      }

      const { data, error: companyError } = await supabase
        .from("companies")
        .select("id, name, slug, business_type, status")
        .eq("slug", queryCompanySlug)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (companyError || !data?.id) {
        setCompanyInfo(null);
        return;
      }

      setCompanyInfo(data);
    }

    loadCompanyInfo();

    return () => {
      active = false;
    };
  }, [queryCompanySlug]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "sign-up" && isCompanyInactive) {
        throw new Error("Для этой компании новая регистрация сейчас отключена.");
      }

      if (mode === "sign-up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        setMessage("Аккаунт создан. Если в проекте включено подтверждение почты, подтвердите адрес и затем войдите.");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        onAuthenticated(data.session);
      }
    } catch (submitError) {
      setError(submitError.message || "Не удалось войти в систему.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setGoogleLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "sign-up" && isCompanyInactive) {
        throw new Error("Для этой компании новая регистрация через Гугл сейчас отключена.");
      }

      const redirectTo = getAuthRedirectUrl();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account"
          }
        }
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (submitError) {
      setError(submitError.message || "Не удалось продолжить через Гугл.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-split">
        <section className="auth-main-card">
          <div className="auth-topbar">
            <div className="auth-topbar-main">
              <NavLink to="/" className="auth-backlink">Вернуться на главную</NavLink>
              <div className="auth-brand-anchor">
                <LogoWordmark />
              </div>
            </div>
            <span className="auth-locale-badge">RU</span>
          </div>

        <div className="auth-copy">
          <h1>{companyInfo ? `Вход в ${companyInfo.name}` : "Вход в систему"}</h1>
          <p>
            {companyInfo
              ? `Рабочий вход для команды компании: ${businessTypeLabels[companyInfo.business_type] || "Автосервис"}.`
              : "Управляйте заявками, клиентами и следующими контактами без лишней перегрузки."}
          </p>
        </div>

        <div className="auth-trust-row">
          <span>CRM для автоуслуг</span>
          <span>Вход для директора, менеджера и мастера</span>
        </div>

          {companyInfo ? (
            <div className="public-company-badge auth-company-badge">
              <strong>{companyInfo.name}</strong>
              <span>{businessTypeLabels[companyInfo.business_type] || "Автосервис"}</span>
              <span>slug: {companyInfo.slug}</span>
            </div>
          ) : null}

          {companyStatusHint ? (
            <p className={`status-note ${isCompanyInactive ? "error" : "success"}`}>
              <strong>{companyStatusHint.title}.</strong> {companyStatusHint.description}
            </p>
          ) : null}

          <div className="auth-switch">
            <button type="button" className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>
              Вход
            </button>
            <button
              type="button"
              className={mode === "sign-up" ? "active" : ""}
              onClick={() => setMode("sign-up")}
              disabled={isCompanyInactive}
            >
              Регистрация
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <label>
                Имя
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Имя владельца или менеджера" required />
              </label>
            ) : null}

            <label>
              Почта
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="почта@пример.md" required />
            </label>

            <label>
              Пароль
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 6 символов" required />
            </label>

            <button type="submit" className="button button-primary button-full" disabled={loading}>
              {loading ? "Выполняется вход..." : mode === "sign-up" ? "Создать аккаунт" : "Войти"}
            </button>
          </form>

          <div className="auth-divider">
            <span>или</span>
          </div>

          <button type="button" className="button button-outline button-full" onClick={handleGoogleAuth} disabled={loading || googleLoading}>
            {googleLoading ? "Подключаем Гугл..." : mode === "sign-up" ? "Продолжить через Гугл" : "Войти через Гугл"}
          </button>

          {message ? <p className="status-note success">{message}</p> : null}
          {error ? <p className="status-note error">{error}</p> : null}

          <p className="auth-legal">
            Продолжая, вы принимаете условия использования и политику конфиденциальности.
          </p>
        </section>

      <aside className="auth-side-card">
        <div className="auth-side-top">
          <LogoWordmark inverse />
        </div>
        <div className="auth-side-media">
          <img src={loginShowcaseImage} alt="Премиальный автомобиль после детейлинга" className="auth-side-image" />
        </div>
        <div className="auth-side-quote">
          <p>После входа команда сразу видит заявки, загрузку и ближайшие действия без лишних звонков и ручных переписок.</p>
          <span>Рабочий вход для владельца, менеджера и мастера</span>
        </div>
        <div className="auth-side-proof">
          <strong>Один вход для всей команды</strong>
          <p>Заявки, фото, статусы и оплаты остаются в одном рабочем контуре, а клиент видит понятное обновление по своей машине.</p>
        </div>
      </aside>
      </div>
    </div>
  );
}


function PublicRequestPage({ isAuthenticated }) {
  const location = useLocation();
  const queryCompanySlug = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("company_slug")?.trim() || "";
  }, [location.search]);
  const demoCompanyMeta = useMemo(() => getMarketingDemoCompanyBySlug(queryCompanySlug), [queryCompanySlug]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [step, setStep] = useState(1);
  const publicCompanySlug = (queryCompanySlug || import.meta.env.VITE_PUBLIC_COMPANY_SLUG || "").trim();
  const effectiveCompanySlug = resolvePublicCompanySlug(publicCompanySlug);
  const [form, setForm] = useState({
    client_name: "",
    phone: "",
    email: "",
    company_slug: effectiveCompanySlug,
    service_id: "",
    car_make: "",
    car_model: "",
    car_year: "",
    car_plate: "",
    source: "landing",
    address: "",
    comment: "",
    preferred_date: "",
    preferred_time: "",
    estimated_price: "",
    follow_up_at: "",
    website: ""
  });
  const automationWebhookUrl = import.meta.env.VITE_AUTOMATION_WEBHOOK_URL;
  const showcaseImage =
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80";
  const selectedService = useMemo(() => services.find((service) => service.id === form.service_id) || null, [form.service_id, services]);
  const publicBusinessType = companyInfo?.business_type || "detailing";
  const publicCopy = publicBusinessTypeContent[publicBusinessType] || publicBusinessTypeContent.detailing;
  const intakeConfig = publicBusinessTypeIntakeConfig[publicBusinessType] || publicBusinessTypeIntakeConfig.detailing;
  const requestSteps = [
    { id: 1, title: "Услуга", description: "Что нужно сделать" },
    { id: 2, title: "Автомобиль", description: "Данные машины" },
    { id: 3, title: "Время", description: "Удобный слот" },
    { id: 4, title: "Контакт", description: "Имя и телефон" }
  ];

  useEffect(() => {
    let active = true;

    async function loadServices() {
      setLoadingServices(true);
      setCompanyInfo(null);
      setServices([]);
      setError("");
      if (!effectiveCompanySlug) {
        setError("Для клиентской формы не настроена компания.");
        setLoadingServices(false);
        return;
      }
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, name, slug, business_type, status")
        .eq("slug", effectiveCompanySlug)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (companyError) {
        setError(companyError.message || "Не удалось определить компанию формы.");
        setLoadingServices(false);
        return;
      }

      if (!companyData?.id) {
        setError("Компания для клиентской формы не найдена.");
        setLoadingServices(false);
        return;
      }

      if (companyData.status !== "active") {
        setError("Клиентская форма этой компании сейчас недоступна.");
        setLoadingServices(false);
        return;
      }

      setCompanyInfo(
        demoCompanyMeta
          ? {
              ...companyData,
              name: demoCompanyMeta.name,
              slug: publicCompanySlug,
              location: demoCompanyMeta.location
            }
          : companyData
      );

      const { data, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("company_id", companyData.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!active) {
        return;
      }

      if (servicesError) {
        setError(servicesError.message || "Не удалось загрузить услуги.");
      } else {
        setServices(data || []);
      }

      setLoadingServices(false);
    }

    loadServices();

    return () => {
      active = false;
    };
  }, [demoCompanyMeta, effectiveCompanySlug, publicCompanySlug]);

  function updateField(event) {
    const { name, value } = event.target;
    setError("");
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function pickService(serviceId) {
    setError("");
    setForm((current) => ({
      ...current,
      service_id: serviceId
    }));
  }

  function goToNextStep() {
    setError("");

    if (step === 1 && !form.service_id) {
      setError("Сначала выберите услугу.");
      return;
    }

    if (step < 4) {
      setStep((current) => current + 1);
    }
  }

  function goToPrevStep() {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.service_id) {
      setError("Сначала выберите услугу.");
      setStep(1);
      return;
    }

    if (!form.client_name.trim()) {
      setError("Укажите имя клиента.");
      setStep(4);
      return;
    }

    if (!form.phone.trim()) {
      setError("Укажите телефон клиента.");
      setStep(4);
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await submitPublicLead(supabase, form);

      try {
        await sendAutomationWebhook(automationWebhookUrl, {
          event: "lead_created",
          public_entry: true,
          lead: result,
          intake: {
            client_name: form.client_name.trim(),
            phone: form.phone.trim(),
            source: form.source,
            service_id: form.service_id || null
          }
        });
      } catch (webhookError) {
        setError(webhookError.message || "Заявка создана, но внешний webhook автоматизации не отработал.");
      }

      setSuccessMessage("Заявка успешно отправлена. Менеджер уже может обработать её в системе.");
      setStep(1);
      setForm({
        client_name: "",
        phone: "",
        email: "",
        company_slug: effectiveCompanySlug,
        service_id: "",
        car_make: "",
        car_model: "",
        car_year: "",
        car_plate: "",
        source: "landing",
        address: "",
        comment: "",
        preferred_date: "",
        preferred_time: "",
        estimated_price: "",
        follow_up_at: "",
        website: ""
      });
    } catch (submitError) {
      setError(submitError.message || "Не удалось отправить заявку.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="public-shell">
      <PublicInstallHint />
      <section className="public-landing-card">
        <div className="public-copy-column">
          <div className="auth-topbar">
            <NavLink to="/" className="auth-backlink">Вернуться на главную</NavLink>
            <LogoWordmark />
          </div>
          <span className="eyebrow">{publicCopy.eyebrow}</span>
          <h1>{publicCopy.title}</h1>
          <p>{publicCopy.description}</p>
          <div className="public-pill-row">
            <span>Быстрый контакт</span>
            <span>Сразу в систему</span>
            <span>Авто-напоминания</span>
          </div>
          {companyInfo ? (
            <div className="public-company-badge">
              <strong>{companyInfo.name}</strong>
              <span>{businessTypeLabels[companyInfo.business_type] || "Автосервис"}</span>
            </div>
          ) : null}
          <div className="public-showcase-card">
            <img src={showcaseImage} alt={publicCopy.imageAlt} className="public-showcase-image" />
          </div>
          {isAuthenticated ? <p className="public-auth-hint">Вы уже в системе, поэтому новая заявка сразу появится в рабочем списке команды после отправки.</p> : null}
        </div>

        <div className="public-form-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Форма клиента</span>
              <h2>Новая заявка</h2>
              <p className="public-form-intro">{publicCopy.intro}</p>
            </div>
          </div>

          {loadingServices ? <p className="hint-text">Загружаем доступные услуги...</p> : null}
          {error ? <div className="notice notice-error">{error}</div> : null}
          {successMessage ? <div className="notice notice-success">{successMessage}</div> : null}

          <form className="form-grid-shell" onSubmit={handleSubmit}>
            <div className="public-stepper">
              {requestSteps.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`public-step-chip${item.id === step ? " active" : ""}${item.id < step ? " done" : ""}`}
                  onClick={() => setStep(item.id)}
                >
                  <span className="public-step-chip-index">{item.id}</span>
                  <span className="public-step-chip-copy">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="public-step-panel">
              <div className="public-step-panel-head">
                <span className="eyebrow">Шаг {step} из 4</span>
                <h3>{requestSteps[step - 1].title}</h3>
              </div>

              {step === 1 ? (
                <div className="public-service-grid">
                  {services.map((service) => {
                    const isSelected = form.service_id === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        className={`public-service-card${isSelected ? " selected" : ""}`}
                        onClick={() => pickService(service.id)}
                      >
                        <strong>{formatServiceName(service.name)}</strong>
                        <span>{service.duration_minutes ? `${service.duration_minutes} мин.` : "Время уточним"}</span>
                        <p>{service.base_price ? `от ${service.base_price} лей` : "Стоимость уточним после осмотра"}</p>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="form-grid two-columns">
                  <label>
                    Марка
                    <input name="car_make" value={form.car_make} onChange={updateField} placeholder={intakeConfig.makePlaceholder} />
                  </label>
                  <label>
                    Модель / год
                    <div className="split-input">
                      <input name="car_model" value={form.car_model} onChange={updateField} placeholder={intakeConfig.modelPlaceholder} />
                      <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder={intakeConfig.yearPlaceholder} />
                    </div>
                  </label>
                  <label>
                    Номер авто
                    <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder={intakeConfig.platePlaceholder} />
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="form-grid two-columns">
                  <label>
                    Желаемая дата
                    <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
                  </label>
                  <label>
                    Желаемое время
                    <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder={intakeConfig.timePlaceholder} />
                  </label>
                  <label className="public-step-full">
                    Комментарий
                    <textarea
                      name="comment"
                      value={form.comment}
                      onChange={updateField}
                      rows="4"
                      placeholder={intakeConfig.commentPlaceholder}
                    />
                  </label>
                </div>
              ) : null}

              {step === 4 ? (
                <>
                  <div className="form-grid two-columns">
                    <label>
                      Имя
                      <input name="client_name" value={form.client_name} onChange={updateField} placeholder="Имя клиента" required />
                    </label>
                    <label>
                      Телефон
                      <input name="phone" value={form.phone} onChange={updateField} placeholder="069" required />
                    </label>
                  </div>

                  <details className="public-optional-details">
                    <summary>Дополнительно</summary>

                    <div className="form-grid two-columns public-optional-grid">
                      <label>
                        Почта
                        <input name="email" type="email" value={form.email} onChange={updateField} placeholder="почта@пример.md" />
                      </label>
                    </div>
                  </details>

                  <div className="public-request-summary">
                    <strong>Итог заявки</strong>
                    <span>{selectedService ? formatServiceName(selectedService.name) : "Услуга не выбрана"}</span>
                    <span>{[form.car_make, form.car_model, form.car_year].filter(Boolean).join(" ") || intakeConfig.summaryFallback}</span>
                    <span>
                      {form.preferred_date || form.preferred_time
                        ? [form.preferred_date, form.preferred_time].filter(Boolean).join(" ")
                        : "Время согласуем после заявки"}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            <input type="hidden" name="service_id" value={form.service_id} onChange={updateField} />

            <input
              type="text"
              name="website"
              value={form.website}
              onChange={updateField}
              tabIndex="-1"
              autoComplete="off"
              aria-hidden="true"
              className="honeypot-field"
            />

            <div className="public-step-actions">
              <button type="button" className="button button-outline" onClick={goToPrevStep} disabled={step === 1 || saving}>
                Назад
              </button>
              {step < 4 ? (
                <button type="button" className="button button-primary" onClick={goToNextStep} disabled={loadingServices}>
                  Далее
                </button>
              ) : (
                <button type="submit" className="button button-primary" disabled={saving || loadingServices}>
                  {saving ? "Отправляем..." : "Отправить заявку"}
                </button>
              )}
            </div>

            <details className="public-optional-details public-optional-details-secondary">
              <summary>Заполнить всё сразу</summary>

              <div className="form-grid two-columns public-optional-grid">
                <label>
                  Марка
                  <input name="car_make" value={form.car_make} onChange={updateField} placeholder={intakeConfig.makePlaceholder} />
                </label>
                <label>
                  Модель / год
                  <div className="split-input">
                    <input name="car_model" value={form.car_model} onChange={updateField} placeholder={intakeConfig.modelPlaceholder} />
                    <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder={intakeConfig.yearPlaceholder} />
                  </div>
                </label>
                <label>
                  Номер авто
                  <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder={intakeConfig.platePlaceholder} />
                </label>
                <label>
                  Желаемая дата
                  <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
                </label>
                <label>
                  Желаемое время
                  <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder={intakeConfig.timePlaceholder} />
                </label>
                <label>
                  Почта
                  <input name="email" type="email" value={form.email} onChange={updateField} placeholder="почта@пример.md" />
                </label>
              </div>

              <label>
                Комментарий
                <textarea
                  name="comment"
                  value={form.comment}
                  onChange={updateField}
                  rows="4"
                  placeholder={intakeConfig.commentPlaceholder}
                />
              </label>
            </details>
          </form>
        </div>
      </section>
    </div>
  );
}

function MarketingHeader({ session }) {
  return (
    <header className="marketing-header">
      <div className="marketing-header-inner">
        <NavLink to="/" className="marketing-brand">
          <img src={detailLogo} alt="Detail CRM" />
          <div>
            <strong>Detail CRM</strong>
            <span>Платформа для автоуслуг</span>
          </div>
        </NavLink>
        <nav className="marketing-nav">
          <NavLink to="/">Главная</NavLink>
          <NavLink to="/catalog">Каталог</NavLink>
          <NavLink to="/pricing">Тарифы</NavLink>
          <NavLink to="/blog">Блог</NavLink>
        </nav>
        <div className="marketing-actions">
          <NavLink to={session ? "/app" : "/login"} className="button button-outline">
            {session ? "Вход для центра" : "Вход для центра"}
          </NavLink>
          <a href="/#marketing-contact" className="button button-primary">
            Добавить свой центр
          </a>
        </div>
      </div>
    </header>
  );
}

function MarketingShell({ session, children }) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll(".reveal-on-scroll"));
    if (!nodes.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="marketing-page">
      <MarketingHeader session={session} />
      {children}
      <footer className="marketing-footer">
        <div className="marketing-footer-inner">
          <div className="marketing-footer-brand">
            <div className="marketing-footer-logo">D</div>
            <div>
              <strong>Detail CRM</strong>
              <p>Платформа для автоуслуг · CRM, запись, статус машины и касса в одном продукте.</p>
            </div>
          </div>
          <div className="marketing-footer-columns">
            <div className="marketing-footer-links">
              <strong>Платформа</strong>
              <NavLink to="/catalog">Каталог</NavLink>
              <NavLink to="/pricing">Тарифы</NavLink>
              <NavLink to="/blog">Блог</NavLink>
              <NavLink to={session ? "/app" : "/login"}>{session ? "CRM" : "Вход"}</NavLink>
            </div>
            <div className="marketing-footer-links">
              <strong>Для центра</strong>
              <a href="/#marketing-contact">Добавить свой центр</a>
              <a href="/request">Форма клиента</a>
              <a href="https://t.me/Iura_Michael" target="_blank" rel="noreferrer">Telegram</a>
            </div>
            <div className="marketing-footer-links">
              <strong>Документы</strong>
              <NavLink to="/site-policy">Политика сайта</NavLink>
              <NavLink to="/terms">Условия обслуживания</NavLink>
              <NavLink to="/privacy">Политика конфиденциальности</NavLink>
              <NavLink to="/cookies">Политика файлов cookie</NavLink>
            </div>
          </div>
        </div>
        <div className="marketing-footer-legal">
          <span>© Detail CRM 2026. Все права защищены. · Live 2026-06-18 v2</span>
          <div className="marketing-footer-legal-links">
            <NavLink to="/site-policy">Политика сайта</NavLink>
            <NavLink to="/terms">Условия обслуживания</NavLink>
            <NavLink to="/privacy">Конфиденциальность</NavLink>
            <NavLink to="/cookies">Cookie</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DemoRequestForm({ initialPlan = "", initialBilling = "monthly", compact = false }) {
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryPlan = query.get("plan") || "";
  const queryBilling = query.get("billing") || "";
  const [form, setForm] = useState({
    name: "",
    phone: "",
    company_name: "",
    business: "detailing",
    role: "owner",
    team_size: "",
    locations_count: "",
    plan: initialPlan || queryPlan || "basic",
    billing: initialBilling || queryBilling || "monthly",
    comment: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const roleLabels = {
    owner: "Владелец",
    manager: "Менеджер",
    admin: "Администратор"
  };

  useEffect(() => {
    const nextPlan = initialPlan || queryPlan || "basic";
    const nextBilling = initialBilling || queryBilling || "monthly";
    setForm((current) => ({
      ...current,
      plan: nextPlan,
      billing: nextBilling
    }));
  }, [initialBilling, initialPlan, queryBilling, queryPlan]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const { data, error } = await supabase.functions.invoke("demo-request", {
        body: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          company_name: form.company_name.trim(),
          business: form.business,
          role: form.role,
          plan: form.plan,
          billing: form.billing,
          comment: form.comment.trim(),
          employees_count: form.team_size ? Number(form.team_size) : null,
          locations_count: form.locations_count ? Number(form.locations_count) : null
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSubmitSuccess(true);
      setForm({
        name: "",
        phone: "",
        company_name: "",
        business: "detailing",
        role: "owner",
        team_size: "",
        locations_count: "",
        plan: initialPlan || queryPlan || "basic",
        billing: initialBilling || queryBilling || "monthly",
        comment: ""
      });
    } catch (requestError) {
      setSubmitError(requestError.message || "Не удалось отправить запрос на демо.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="marketing-demo-form reveal-on-scroll" id="marketing-contact">
      <div className="marketing-demo-copy">
        <span className="section-eyebrow">Для центра</span>
        <h2>{compact ? "Подключение центра" : "Подключите центр и запустите каталог + CRM"}</h2>
        <p>
          Это форма для владельца или менеджера центра. Выберите пакет, оставьте контакты, а дальше мы свяжемся, разберём процесс и настроим CRM под ваш сервис.
        </p>
      </div>
      <form className="marketing-demo-card" onSubmit={handleSubmit}>
        <label>
          Название центра
          <input
            type="text"
            placeholder="Например, Crystal Detail Garage"
            value={form.company_name}
            onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
          />
        </label>
        <label>
          Имя
          <input
            type="text"
            placeholder="Ваше имя"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          Телефон
          <input
            type="text"
            placeholder="069..."
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </label>
        <label>
          Ниша
          <select
            value={form.business}
            onChange={(event) => setForm((current) => ({ ...current, business: event.target.value }))}
          >
            <option value="detailing">Детейлинг</option>
            <option value="car_wash">Автомойка</option>
            <option value="tire_service">Шиномонтаж</option>
            <option value="auto_service">Автосервис</option>
          </select>
        </label>
        <label>
          Кто вы в центре
          <select
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          >
            <option value="owner">Владелец</option>
            <option value="manager">Менеджер</option>
            <option value="admin">Администратор</option>
          </select>
        </label>
        <label>
          Пакет
          <select
            value={form.plan}
            onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}
          >
            <option value="basic">Basic</option>
            <option value="solo">Solo</option>
            <option value="professional">Professional</option>
          </select>
        </label>
        <label>
          Оплата
          <select
            value={form.billing}
            onChange={(event) => setForm((current) => ({ ...current, billing: event.target.value }))}
          >
            <option value="monthly">1 month</option>
            <option value="yearly">1 year</option>
          </select>
        </label>
        <label>
          Сколько сотрудников
          <input
            type="number"
            min="1"
            placeholder="1"
            value={form.team_size}
            onChange={(event) => setForm((current) => ({ ...current, team_size: event.target.value }))}
          />
        </label>
        <label>
          Сколько локаций
          <input
            type="number"
            min="1"
            placeholder="1"
            value={form.locations_count}
            onChange={(event) => setForm((current) => ({ ...current, locations_count: event.target.value }))}
          />
        </label>
        <label className="marketing-demo-card-full">
          Комментарий
          <textarea
            placeholder="Например: нужен запуск каталога, роли для команды, касса и статус клиента."
            value={form.comment}
            onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
          />
        </label>
        <div className="marketing-demo-actions">
          <a href="/request" className="btn-lg ghost">Посмотреть пример заказа</a>
          <button type="submit" className="btn-lg primary" disabled={submitting}>
            {submitting ? "Отправляем..." : "Настроить CRM под мой сервис"}
          </button>
        </div>
        {submitSuccess ? (
          <>
            <p className="marketing-demo-note success">Заявка отправлена. Следующий шаг: созвон, настройка CRM под ваш сервис и запуск первых рабочих заявок.</p>
            <div className="marketing-contact-actions">
              <a href="https://t.me/Iura_Michael" target="_blank" rel="noreferrer" className="btn-lg primary">
                Перейти в Telegram
              </a>
              <NavLink to="/catalog" className="btn-lg ghost">
                Открыть каталог
              </NavLink>
            </div>
          </>
        ) : null}
        {submitError ? <p className="marketing-demo-note error">{submitError}</p> : null}
        {!submitSuccess && !submitError ? (
          <p className="marketing-demo-note">
            Заявка приходит как запрос на подключение центра: ниша, тариф, период оплаты и размер команды уже видны сразу, чтобы запуск не начинался с пустого разговора.
          </p>
        ) : null}
      </form>
    </section>
  );
}

function MarketingContactStrip({ session }) {
  return (
    <section className="marketing-contact-strip reveal-on-scroll" id="marketing-contacts">
      <div className="marketing-contact-copy">
        <div className="section-eyebrow">Подключение</div>
        <h2>Получить демо и запуск с человеком</h2>
        <div className="marketing-contact-links">
          <a href="https://t.me/Iura_Michael" target="_blank" rel="noreferrer">Telegram</a>
          <a href="/login">Вход в CRM</a>
          <a href="/request">Форма клиента</a>
        </div>
      </div>
      <div className="marketing-contact-actions">
        <NavLink to={session ? "/app" : "/login"} className="btn-lg ghost">
          {session ? "Открыть CRM" : "Войти в CRM"}
        </NavLink>
        <a href="#marketing-contact" className="btn-lg primary">Получить демо</a>
      </div>
    </section>
  );
}

function MarketingHomePage({ session }) {
  return (
    <MarketingShell session={session}>
      <main className="marketing-home">
        <section className="catalog-hero-section">
          <div className="container-marketing">
            <div className="catalog-hero-grid reveal-on-scroll">
              <div className="catalog-hero-copy">
                <span className="section-eyebrow">CRM для автоуслуг в Молдове</span>
                <h1>
                  CRM для детейлинга,
                  <br />
                  автомоек и
                  <br />
                  автостудий
                </h1>
                <div className="catalog-hero-actions">
                  <a href="#marketing-contact" className="btn-lg primary">Получить демо</a>
                  <NavLink to="/pricing" className="btn-lg ghost">Посмотреть тарифы</NavLink>
                </div>
              </div>
              <div className="catalog-hero-visual">
                <img
                  src="https://images.unsplash.com/photo-1541443131876-44b03de101c5?auto=format&fit=crop&w=1400&q=80"
                  alt="Детейлинг автомобиля"
                />
              </div>
            </div>

          </div>
        </section>

        <section className="catalog-stats-section">
          <div className="container-marketing">
            <div className="catalog-stats-grid reveal-on-scroll">
              {marketingCatalogStats.map((item) => (
                <article key={item.label} className="catalog-stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="catalog-section">
          <div className="container-marketing">
            <div className="catalog-section-head reveal-on-scroll">
              <h2>Рекомендуемые партнёры</h2>
            </div>
            <div className="partner-card-grid">
              {marketingPartnerCards.map((item, index) => (
                <NavLink
                  key={item.name}
                  to={`/s/${encodeURIComponent(item.slug)}`}
                  className="partner-card reveal-on-scroll"
                  style={{ transitionDelay: `${index * 0.06}s` }}
                >
                  <div className="partner-card-image-wrap">
                    <span className="partner-badge">Партнёр</span>
                    <img src={item.image} alt={item.name} className="partner-card-image" />
                  </div>
                  <div className="partner-card-body">
                    <strong>{item.name}</strong>
                    <span>{item.location}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-positioning-section">
          <div className="container-marketing">
            <div className="marketing-positioning-grid reveal-on-scroll">
              {marketingFeatureCards.map((item) => (
                <article key={item.title} className="marketing-positioning-card">
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-onboarding-section">
          <div className="container-marketing">
            <div className="marketing-onboarding-shell reveal-on-scroll">
              <div className="marketing-onboarding-head">
                <h2>Как зарегистрировать центр в Detail CRM</h2>
              </div>
              <div className="marketing-onboarding-steps">
                {marketingOnboardingSteps.map((item, index) => (
                  <article key={item.title} className="marketing-onboarding-step">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-roles-section">
          <div className="container-marketing">
            <div className="pricing-benefits-grid reveal-on-scroll">
              {marketingRoleCards.map((item) => (
                <article key={item.title} className="pricing-benefit-card">
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="catalog-app-section">
          <div className="container-marketing">
            <div className="catalog-app-card reveal-on-scroll">
              <div className="catalog-app-copy">
                <span className="catalog-app-eyebrow">Установить как приложение</span>
                <h2>Сохраните каталог на телефон</h2>
                <div className="catalog-app-steps">
                  <article className="catalog-app-step">
                    <strong>1</strong>
                    <div>
                      <h3>Откройте сайт</h3>
                    </div>
                  </article>
                  <article className="catalog-app-step">
                    <strong>2</strong>
                    <div>
                      <h3>Добавьте на экран</h3>
                    </div>
                  </article>
                  <article className="catalog-app-step">
                    <strong>3</strong>
                    <div>
                      <h3>Открывайте как приложение</h3>
                    </div>
                  </article>
                </div>
                <div className="catalog-app-actions">
                  <NavLink to="/request" className="btn-lg primary">Открыть клиентскую запись</NavLink>
                  <a href="#marketing-contact" className="btn-lg ghost">Подключить свой центр</a>
                </div>
              </div>
              <div className="catalog-app-visual" aria-hidden="true">
                <div className="catalog-app-phone phone-back">
                  <div className="catalog-app-phone-header">
                    <img src={detailLogo} alt="" />
                    <span>Detail CRM</span>
                  </div>
                  <div className="catalog-app-phone-search">Автомойка, детейлинг, сервис</div>
                  <div className="catalog-app-phone-grid">
                    <span>Детейлинг</span>
                    <span>Автомойка</span>
                    <span>Шиномонтаж</span>
                    <span>Автосервис</span>
                  </div>
                </div>
                <div className="catalog-app-phone phone-front">
                  <div className="catalog-app-phone-notch" />
                  <div className="catalog-app-install-badge">Добавить на экран</div>
                  <div className="catalog-app-phone-card">
                    <img src={detailLogo} alt="" />
                    <div>
                      <strong>Detail CRM</strong>
                      <span>Каталог автоуслуг</span>
                    </div>
                  </div>
                  <div className="catalog-app-phone-list">
                    <div>Партнёры рядом</div>
                    <div>Быстрая запись</div>
                    <div>Статус машины</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <DemoRequestForm />
        <MarketingContactStrip session={session} />
      </main>
    </MarketingShell>
  );
}

function MarketingFeaturesPage({ session }) {
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("Любой");
  const [city, setCity] = useState("Все города");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [sortBy, setSortBy] = useState("partner");

  const filteredListings = useMemo(() => {
    let items = marketingCatalogListings.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        `${item.name} ${item.category} ${item.city} ${item.district}`.toLowerCase().includes(search.trim().toLowerCase());
      const matchesPayment = payment === "Любой" || item.payment === payment;
      const matchesCity = city === "Все города" || item.city === city;
      const matchesCategory = !selectedCategories.length || selectedCategories.includes(item.category);
      const matchesDistrict = !selectedDistricts.length || selectedDistricts.includes(item.district);
      return matchesSearch && matchesPayment && matchesCity && matchesCategory && matchesDistrict;
    });

    if (sortBy === "rating") {
      items = [...items].sort((a, b) => b.reviews - a.reviews);
    } else if (sortBy === "name") {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    } else {
      items = [...items].sort((a, b) => {
        const aScore = a.badge === "Партнёр" ? 1 : 0;
        const bScore = b.badge === "Партнёр" ? 1 : 0;
        return bScore - aScore;
      });
    }

    return items;
  }, [city, payment, search, selectedCategories, selectedDistricts, sortBy]);

  function toggleFilterValue(currentValues, setter, value) {
    setter(
      currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : currentValues.concat(value)
    );
  }

  return (
    <MarketingShell session={session}>
      <main className="marketing-inner-page marketing-catalog-page">
        <section className="catalog-page-hero">
          <div className="container-marketing">
            <div className="catalog-page-head reveal-on-scroll">
              <h1>Каталог детейлинг-центров, автомоек и автосервисов</h1>
              <p>Найдите партнёра по городу, формату оплаты и нужной услуге.</p>
            </div>
          </div>
        </section>

        <section className="catalog-directory-section">
          <div className="container-marketing catalog-directory-layout">
            <aside className="catalog-filters-panel reveal-on-scroll">
              <div className="catalog-filters-head">
                <strong>Фильтры</strong>
              </div>

              <div className="catalog-filter-group">
                <strong>Категория</strong>
                <div className="catalog-filter-list">
                  {marketingCatalogFilters.categories.map((category) => (
                    <label key={category} className="catalog-check">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleFilterValue(selectedCategories, setSelectedCategories, category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="catalog-filter-group">
                <strong>Район</strong>
                <div className="catalog-filter-list">
                  {marketingCatalogFilters.districts.map((district) => (
                    <label key={district} className="catalog-check">
                      <input
                        type="checkbox"
                        checked={selectedDistricts.includes(district)}
                        onChange={() => toggleFilterValue(selectedDistricts, setSelectedDistricts, district)}
                      />
                      <span>{district}</span>
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            <div className="catalog-results-block">
              <div className="catalog-top-filters reveal-on-scroll">
                <label>
                  <span>Название центра</span>
                  <input
                    type="text"
                    placeholder="Поиск центра, мойки или сервиса"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label>
                  <span>Метод оплаты</span>
                  <select value={payment} onChange={(event) => setPayment(event.target.value)}>
                    {marketingCatalogFilters.paymentMethods.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Город</span>
                  <select value={city} onChange={(event) => setCity(event.target.value)}>
                    {marketingCatalogFilters.cities.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className="button button-primary catalog-search-submit">
                  Поиск
                </button>
              </div>

              <div className="catalog-results-toolbar reveal-on-scroll">
                <strong>{filteredListings.length} найденных центров</strong>
                <div className="catalog-results-actions">
                  <span>Сортировать</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="partner">Партнёр</option>
                    <option value="rating">По отзывам</option>
                    <option value="name">По названию</option>
                  </select>
                </div>
              </div>

              <div className="catalog-results-grid">
                {filteredListings.map((item) => (
                  <article key={item.name} className="catalog-result-card">
                    <div className="catalog-result-media">
                      <span className={`catalog-result-badge ${item.badge === "Featured" ? "featured" : ""}`}>
                        {item.badge}
                      </span>
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="catalog-result-body">
                      <div className="catalog-result-rating">
                        <span>★ {item.rating}</span>
                        <span>({item.reviews} отзывов)</span>
                      </div>
                      <strong>{item.name}</strong>
                      <span>{item.city} · {item.district}</span>
                      <p>{item.category} · {item.payment}</p>
                      <div className="catalog-result-actions">
                        <NavLink to="/request" className="button button-primary">Записаться</NavLink>
                        <a href="#marketing-contact" className="button button-outline">Подключить</a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <MarketingContactStrip session={session} />
      </main>
    </MarketingShell>
  );
}

function MarketingPricingPage({ session }) {
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const plans = marketingPricingPlans[billingInterval] || marketingPricingPlans.monthly;

  function selectPlan(planId) {
    setSelectedPlan(planId);
    const formNode = document.getElementById("marketing-contact");
    if (formNode) {
      formNode.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <MarketingShell session={session}>
      <main className="marketing-inner-page marketing-pricing-page">
        <section className="pricing-page-hero">
          <div className="container-marketing">
            <div className="catalog-page-head reveal-on-scroll">
              <h1>Тарифы для каталога, команды и подключений</h1>
              <p>Три понятных пакета для центра: старт без оплаты, рабочий Solo и Professional для полноценной команды.</p>
            </div>
          </div>
        </section>

        <section className="pricing-tabs-section">
          <div className="container-marketing">
            <div className="pricing-tabs-shell reveal-on-scroll">
              <span>Период оплаты</span>
              <div className="pricing-tabs-row">
                {marketingPricingIntervals.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={billingInterval === item.id ? "active" : ""}
                    onClick={() => setBillingInterval(item.id)}
                    style={
                      billingInterval === item.id
                        ? {
                            background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
                            borderColor: "#22c55e",
                            color: "#ffffff",
                            boxShadow: "0 12px 28px rgba(16, 185, 129, 0.22)"
                          }
                        : undefined
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pricing-sales-note reveal-on-scroll">
              <strong>Подключаем не только тариф, а рабочий контур центра.</strong>
              <p>После выбора пакета мы созваниваемся, понимаем процесс, настраиваем CRM под нишу и обучаем владельца, менеджера и мастеров.</p>
            </div>
          </div>
        </section>

        <section className="pricing-cards-section">
          <div className="container-marketing">
            <div className="pricing-cards-grid">
              {plans.map((item) => (
                <article key={`${billingInterval}-${item.name}`} className={`pricing-directory-card ${item.badge === "Popular" ? "featured" : ""}`}>
                  <div className="pricing-directory-head">
                    <strong>{item.name}</strong>
                    {item.badge ? <span>{item.badge}</span> : null}
                  </div>
                  <p className="pricing-directory-description">{item.description}</p>
                  <div className="pricing-directory-price-block">
                    <div className="pricing-directory-price">{item.price}</div>
                    {item.oldPrice ? <span className="pricing-directory-old-price">{item.oldPrice}</span> : null}
                  </div>
                  <p>{item.note}</p>
                  <p className="pricing-directory-after-note">{item.afterNote}</p>
                  <strong className="pricing-directory-features-title">{item.featuresTitle}</strong>
                  <ul>
                    {item.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => selectPlan(item.id)}
                  >
                    Получить демо
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-benefits-section">
          <div className="container-marketing">
            <div className="pricing-benefits-grid">
              {[
                ["Каталог + CRM"],
                ["Фото до/после"],
                ["Статус машины"],
                ["Telegram"]
              ].map(([title]) => (
                <article key={title} className="pricing-benefit-card reveal-on-scroll">
                  <strong>{title}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="pricing-onboarding-section">
          <div className="container-marketing">
            <DemoRequestForm initialPlan={selectedPlan} initialBilling={billingInterval} />
          </div>
        </section>
        <MarketingContactStrip session={session} />
      </main>
    </MarketingShell>
  );
}

function MarketingDemoPage({ session }) {
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");

  const filteredPosts = useMemo(() => {
    return marketingBlogPosts.filter((item) => {
      const matchesCategory = category === "Все" || item.category === category;
      const matchesSearch =
        !search.trim() ||
        `${item.title} ${item.excerpt}`.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <MarketingShell session={session}>
      <main className="marketing-inner-page marketing-blog-page">
        <section className="blog-page-hero">
          <div className="container-marketing">
            <div className="catalog-page-head reveal-on-scroll">
              <h1>Как каталог + CRM работают для автоуслуг</h1>
              <p>Материалы для владельца центра: как не терять заявки, как вести клиента по этапам и как показывать работу через статус и фото.</p>
            </div>
          </div>
        </section>

        <section className="blog-toolbar-section">
          <div className="container-marketing">
            <div className="blog-toolbar reveal-on-scroll">
              <div className="blog-category-row">
                {marketingBlogCategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={category === item ? "active" : ""}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="blog-toolbar-meta">
                <strong>{filteredPosts.length} статей</strong>
                <input
                  type="text"
                  placeholder="Поиск статьи"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="blog-grid-section">
          <div className="container-marketing">
            <div className="blog-grid">
              {filteredPosts.map((item) => (
                <article key={`${item.date}-${item.title}`} className="blog-card">
                  <div className="blog-card-image-wrap">
                    <img src={item.image} alt={item.title} className="blog-card-image" />
                    <span className="blog-card-badge">{item.category}</span>
                  </div>
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      <span>{item.date}</span>
                      <span>{item.views} просмотров</span>
                    </div>
                    <strong>{item.title}</strong>
                    <p>{item.excerpt}</p>
                    <a href="#marketing-contact">Читать статью</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <MarketingContactStrip session={session} />
      </main>
    </MarketingShell>
  );
}

const marketingLegalPages = {
  "site-policy": {
    title: "Политика сайта",
    intro: "Основные правила использования витрины, каталога и публичных форм Detail CRM.",
    sections: [
      ["Назначение платформы", "Detail CRM помогает автосервисам, автомойкам, детейлинг-центрам и шиномонтажам размещаться в каталоге, принимать заявки и вести клиентский поток в одном продукте."],
      ["Публичные формы", "Отправляя заявку через сайт, пользователь подтверждает корректность введенных данных и согласие на обратную связь по выбранной услуге."],
      ["Размещение в каталоге", "Карточки центров, фотографии, описания и контакты публикуются после согласования с владельцем площадки или представителем компании."],
      ["Изменения контента", "Мы можем обновлять структуру витрины, тексты, разделы и карточки каталога, чтобы улучшать качество сервиса и подачу продукта."]
    ]
  },
  terms: {
    title: "Условия обслуживания",
    intro: "Условия регулируют использование каталога, CRM-кабинета и публичных страниц Detail CRM.",
    sections: [
      ["Доступ к системе", "Рабочий кабинет центра открывается после регистрации, подтверждения компании и активации выбранного тарифа или тестового периода."],
      ["Тарифы и активация", "Тарифы, тестовые периоды и условия подключения могут отличаться по числу пользователей, ролям, объему функций и поддержке запуска."],
      ["Ответственность центра", "Компания отвечает за корректность данных о клиентах, записях, услугах, оплатах и статусах работ, которые вносит в систему."],
      ["Поддержка и развитие", "Мы оставляем за собой право улучшать продукт, обновлять интерфейсы и расширять функциональность без ухудшения базового доступа по активному тарифу."]
    ]
  },
  privacy: {
    title: "Политика конфиденциальности",
    intro: "Мы бережно относимся к контактам клиентов, данным компаний и рабочей информации внутри платформы.",
    sections: [
      ["Какие данные используются", "Платформа может обрабатывать имя, телефон, email, данные автомобиля, историю записей, фотографии по работам и служебные заметки компании."],
      ["Зачем это нужно", "Эти данные используются для записи клиентов, управления визитами, статусов работ, уведомлений и внутренней аналитики компании."],
      ["Кто имеет доступ", "Доступ к рабочим данным ограничивается ролями внутри компании и административным доступом, необходимым для поддержки платформы."],
      ["Удаление и корректировка", "Компания может запросить обновление или удаление данных через свой кабинет или через владельца платформы."]
    ]
  },
  cookies: {
    title: "Политика файлов cookie",
    intro: "Cookie помогают запоминать настройки, удерживать сессию и понимать, как пользователи работают с витриной.",
    sections: [
      ["Технические cookie", "Используются для входа в кабинет, сохранения сессии, маршрутизации и стабильной работы публичных страниц."],
      ["Аналитические cookie", "Могут использоваться для понимания посещаемости страниц, популярных разделов каталога и общего качества пользовательского опыта."],
      ["Управление cookie", "Пользователь может ограничить или удалить cookie через настройки браузера, но часть функций сайта после этого может работать не полностью."],
      ["Обновления политики", "При изменении подхода к cookie эта страница обновляется вместе с актуальной датой версии сайта."]
    ]
  }
};

function MarketingLegalPage({ session, pageKey }) {
  const page = marketingLegalPages[pageKey] || marketingLegalPages["site-policy"];

  return (
    <MarketingShell session={session}>
      <main className="marketing-inner-page legal-page">
        <section className="legal-hero">
          <div className="container-marketing">
            <div className="catalog-page-head reveal-on-scroll">
              <h1>{page.title}</h1>
              <p>{page.intro}</p>
            </div>
          </div>
        </section>
        <section className="legal-sections">
          <div className="container-marketing legal-sections-grid">
            {page.sections.map(([title, text]) => (
              <article key={title} className="legal-card reveal-on-scroll">
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}

function TopBar({
  session,
  role,
  permissions,
  isPlatformAdmin = false,
  onSignOut,
  currentUserName,
  companies = [],
  activeCompanyId = null,
  onCompanyChange
}) {
  const location = useLocation();
  const centerNavItems = isPlatformAdmin
    ? []
    : navItems.filter((item) => item.to !== "/settings" && permissions.nav.includes(item.to));
  const platformNavItems = isPlatformAdmin ? [{ to: "/platform", label: "Платформа" }] : [];
  const fullName = currentUserName || session.user.user_metadata?.full_name || "Пользователь";
  const activeCompany = companies.find((company) => company.id === activeCompanyId) || companies[0] || null;
  const displayRoleLabel = isPlatformAdmin ? roleLabels.platform_admin : roleLabels[role] || roleLabels.manager;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <LogoWordmark />
        {!isPlatformAdmin && activeCompany ? (
          companies.length > 1 ? (
            <label className="topbar-company-switch">
              <span>Компания</span>
              <select value={activeCompanyId || activeCompany.id} onChange={(event) => onCompanyChange?.(event.target.value)}>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <small className="topbar-company-meta">
                {businessTypeLabels[activeCompany.business_type] || "Автосервис"} · {planLabels[activeCompany.plan_code] || "Старт"}
              </small>
            </label>
          ) : (
            <div className="topbar-company-badge">
              <span>Компания</span>
              <strong>{activeCompany.name}</strong>
              <small className="topbar-company-meta">
                {businessTypeLabels[activeCompany.business_type] || "Автосервис"} · {planLabels[activeCompany.plan_code] || "Старт"}
              </small>
            </div>
          )
        ) : null}
      </div>

      <nav className="topbar-nav">
        {[...platformNavItems, ...centerNavItems].map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "topbar-link active" : "topbar-link")}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-actions">
        {!isPlatformAdmin && permissions.canCreateLead ? (
          <NavLink to="/leads" className="button button-primary topbar-cta">
            Новая заявка
          </NavLink>
        ) : null}
        {!isPlatformAdmin && permissions.nav.includes("/settings") ? (
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "button button-outline active-outline" : "button button-outline")}
          >
            Настройки
          </NavLink>
        ) : null}
        <div className="topbar-user">
          <div className="user-meta">
            <strong>{displayRoleLabel}</strong>
            <span>{fullName}</span>
          </div>
          <Avatar name={fullName} />
          <button type="button" className="ghost-action" onClick={onSignOut}>
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}

function AppLayout({
  session,
  metrics,
  role,
  isPlatformAdmin = false,
  children,
  onSignOut,
  currentUserName,
  companies,
  activeCompanyId,
  onCompanyChange
}) {
  const permissions = getRolePermissions(role);

  return (
    <div className="crm-shell">
      <TopBar
        session={session}
        role={role}
        permissions={permissions}
        isPlatformAdmin={isPlatformAdmin}
        onSignOut={onSignOut}
        currentUserName={currentUserName}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onCompanyChange={onCompanyChange}
      />

      <main className="crm-main">
        <div className="crm-summary-bar">
          <span>{metrics.newCount} новых</span>
          <span>{metrics.openTasks} открытых задач</span>
          <span>{metrics.followUpCount} напоминаний на сегодня</span>
        </div>
        {children}
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, accent = false, variant = "" }) {
  const className = [accent ? "metric-card accent" : "metric-card", variant ? `metric-card-${variant}` : ""].filter(Boolean).join(" ");
  return (
    <article className={className}>
      <MiniIcon label={icon} accent={accent} variant={variant} />
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function DashboardPage({ metrics, leads, businessType = "detailing", onOpenLead }) {
  const dashboardCopy = getOwnerDashboardCopy(businessType);
  const todayRevenue = useMemo(
    () =>
      leads
        .filter((lead) => lead.payment_status !== "unpaid" && lead.paid_at && isSameCalendarDay(lead.paid_at, new Date()))
        .reduce((sum, lead) => sum + getLeadPaidAmount(lead), 0),
    [leads]
  );
  const waitingApprovalCount = useMemo(() => leads.filter((lead) => ["diagnostics", "approval"].includes(lead.status)).length, [leads]);
  const readyToDeliverCount = useMemo(() => leads.filter((lead) => ["done", "paid"].includes(lead.status)).length, [leads]);
  const deliveredCount = useMemo(() => leads.filter((lead) => getLeadStageKey(lead.status) === "delivered").length, [leads]);
  const waitingPaymentCount = useMemo(() => leads.filter((lead) => lead.status === "waiting_payment" || lead.payment_status === "unpaid").length, [leads]);
  const todayInWorkCount = useMemo(() => leads.filter((lead) => getLeadStageKey(lead.status) === "in_progress").length, [leads]);
  const ownerActionCount = metrics.newCount + waitingApprovalCount + waitingPaymentCount + readyToDeliverCount;
  const repeatClientsCount = useMemo(() => {
    const countsByClient = new Map();
    leads.forEach((lead) => {
      if (!lead.client_id) {
        return;
      }

      countsByClient.set(lead.client_id, (countsByClient.get(lead.client_id) || 0) + 1);
    });

    return [...countsByClient.values()].filter((count) => count > 1).length;
  }, [leads]);
  const stuckLeads = useMemo(
    () =>
      leads
        .filter((lead) => ["diagnostics", "approval", "waiting_client", "waiting_payment"].includes(lead.status))
        .sort((left, right) => getComparableDate(left.updated_at || left.created_at) - getComparableDate(right.updated_at || right.created_at)),
    [leads]
  );

  return (
    <section className="page-stack">
      <div className="metrics-grid">
        <MetricCard icon="КЛ" label={dashboardCopy.clientsLabel} value={metrics.clientsCount} accent />
        <MetricCard icon="СГ" label={dashboardCopy.todayLabel} value={metrics.todayLeads} />
        <MetricCard icon="€" label={dashboardCopy.revenueLabel} value={formatCurrency(metrics.monthRevenue)} />
        <MetricCard icon="ЗД" label={dashboardCopy.tasksLabel} value={metrics.openTasks} />
      </div>

      <section className="surface-card owner-command-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">Панель директора</span>
            <h2>Сначала смотреть сюда</h2>
            <p>Одна строка показывает, где нужно действие, где работа идёт нормально и где лежат деньги.</p>
          </div>
        </div>
        <div className="owner-command-grid">
          <article className="owner-command-tile owner-command-tile-action">
            <span>Нужно действие</span>
            <strong>{ownerActionCount}</strong>
            <p>{metrics.newCount} новых, {waitingApprovalCount} согласовать, {waitingPaymentCount} оплатить, {readyToDeliverCount} выдать.</p>
          </article>
          <article className="owner-command-tile owner-command-tile-work">
            <span>В работе сейчас</span>
            <strong>{todayInWorkCount}</strong>
            <p>Машины, по которым команда уже ведёт процесс.</p>
          </article>
          <article className="owner-command-tile owner-command-tile-ready">
            <span>Готово / выдано</span>
            <strong>{readyToDeliverCount} / {deliveredCount}</strong>
            <p>Сначала выдать готовые, затем закрыть как выданные.</p>
          </article>
          <article className="owner-command-tile owner-command-tile-money">
            <span>Деньги</span>
            <strong>{formatCurrency(metrics.monthOutstandingRevenue)}</strong>
            <p>Остаток к оплате. Сегодня оплачено: {formatCurrency(todayRevenue)}.</p>
          </article>
        </div>

        <div className="owner-mini-strip">
          <article><span>Клиентов</span><strong>{metrics.clientsCount}</strong></article>
          <article><span>Повторных</span><strong>{repeatClientsCount}</strong></article>
          <article><span>Зависших</span><strong>{stuckLeads.length}</strong></article>
          <article><span>Открытых задач</span><strong>{metrics.openTasks}</strong></article>
        </div>
      </section>

      <section className="surface-card month-summary-card owner-finance-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">Финансы</span>
            <h2>Деньги и закрытые работы</h2>
            <p>Главное по месяцу: сколько закрыто, сколько получено и сколько ещё должны.</p>
          </div>
        </div>

        <div className="month-summary-grid owner-finance-grid">
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthPaidRevenue)}</strong>
            <span>Получено за месяц</span>
          </article>
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthOutstandingRevenue)}</strong>
            <span>Остаток к оплате</span>
          </article>
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthRevenue)}</strong>
            <span>Касса за месяц</span>
          </article>
          <article className="month-summary-stat">
            <strong>{metrics.monthClosedLeads}</strong>
            <span>Закрыто работ</span>
          </article>
        </div>

        <div className="month-summary-grid payment-month-grid owner-finance-secondary">
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthAverageTicket)}</strong>
            <span>Средний чек</span>
          </article>
          <article className="month-summary-stat">
            <strong>{metrics.monthPaidLeads}</strong>
            <span>Оплаченных заявок</span>
          </article>
          <article className="month-summary-stat">
            <strong>{metrics.monthPartialLeads}</strong>
            <span>Частично оплачено</span>
          </article>
          <article className="month-summary-stat">
            <strong>{metrics.monthUnpaidLeads}</strong>
            <span>Не оплачено заявок</span>
          </article>
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthDebtLeadsRevenue)}</strong>
            <span>Долг по месяцу</span>
          </article>
        </div>

        <div className="data-table compact-table period-summary-table">
          <div className="table-head period-summary-head">
            <span>Период</span>
            <span>Заявок</span>
            <span>Готово</span>
            <span>Касса</span>
            <span>Средний чек</span>
          </div>
          {metrics.periodSummaries.map((item) => (
            <div key={item.key} className="table-body-row period-summary-row">
              <span className="cell-strong">{item.label}</span>
              <span>{item.leadsCount}</span>
              <span>{item.doneCount}</span>
              <span className="amount-cell">{formatCurrency(item.revenue)}</span>
              <span className="amount-cell">{formatCurrency(item.averageTicket)}</span>
            </div>
          ))}
        </div>

        <div className="data-table compact-table period-summary-table">
          <div className="table-head period-summary-head payment-period-head">
            <span>Период</span>
            <span>Оплачено</span>
            <span>Остаток</span>
            <span>Частично</span>
            <span>Не оплач.</span>
            <span>Наличные</span>
            <span>Карта</span>
            <span>Перевод</span>
          </div>
          {metrics.paymentPeriodSummaries.map((item) => (
            <div key={item.key} className="table-body-row period-summary-row payment-period-row">
              <span className="cell-strong">{item.label}</span>
              <span className="amount-cell">{formatCurrency(item.paidRevenue)}</span>
              <span className="amount-cell">{formatCurrency(item.outstandingRevenue)}</span>
              <span>{item.partialCount}</span>
              <span>{item.unpaidCount}</span>
              <span className="amount-cell">{formatCurrency(item.cashRevenue)}</span>
              <span className="amount-cell">{formatCurrency(item.cardRevenue)}</span>
              <span className="amount-cell">{formatCurrency(item.transferRevenue)}</span>
            </div>
          ))}
        </div>

        <div className="data-table compact-table">
          <div className="table-head month-revenue-head">
            <span>Услуга</span>
            <span>Заявок</span>
            <span>Сумма</span>
          </div>
          {metrics.monthServiceRevenue.length ? (
            metrics.monthServiceRevenue.map((item) => (
              <div key={formatServiceName(item.name)} className="table-body-row month-revenue-row">
                <span className="cell-strong">{formatServiceName(item.name)}</span>
                <span>{item.count}</span>
                <span className="amount-cell">{formatCurrency(item.total)}</span>
              </div>
            ))
          ) : (
            <div className="table-empty-state">{dashboardCopy.serviceTableEmpty}</div>
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">{dashboardCopy.recentEyebrow}</span>
            <h2>{dashboardCopy.recentTitle}</h2>
          </div>
        </div>

        <div className="data-table">
          <div className="table-head">
            <span>Клиент</span>
            <span>Услуга</span>
            <span>Статус</span>
            <span>Дата</span>
            <span>Сумма</span>
            <span>Действие</span>
          </div>

          {leads.length ? (
            leads.slice(0, 6).map((lead) => (
              <div key={lead.id} className="table-body-row">
                <span className="cell-strong">{formatClientName(lead.clients?.name) || "Без имени"}</span>
                <span>{formatServiceName(lead.services?.name)}</span>
                <span>
                  <StatusBadge status={lead.status} />
                </span>
                <span>{formatShortDate(lead.created_at)}</span>
                <span className="amount-cell">{formatCurrency(getLeadAmount(lead))}</span>
                <span>
                  <NavLink to="/leads" className="table-link" onClick={() => onOpenLead(lead.id)}>
                    Открыть
                  </NavLink>
                </span>
              </div>
            ))
          ) : (
            <div className="table-empty-state">Пока нет заявок для отображения.</div>
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">Требуют внимания</span>
            <h2>Зависшие или чувствительные заказы</h2>
          </div>
        </div>
        <div className="task-list">
          {stuckLeads.length ? (
            stuckLeads.slice(0, 6).map((lead) => (
              <article key={lead.id} className="task-item">
                <div className="task-item-main">
                  <MiniIcon label="!" accent />
                  <div>
                    <strong>{formatClientName(lead.clients?.name) || "Клиент без имени"}</strong>
                    <span>{formatServiceName(lead.services?.name || "Услуга уточняется")}</span>
                  </div>
                </div>
                <div className="task-item-side manager-task-side">
                  <StatusBadge status={lead.status} businessType={businessType} />
                  <small>{formatDate(lead.updated_at || lead.created_at)}</small>
                  <NavLink to="/leads" className="table-link" onClick={() => onOpenLead(lead.id)}>
                    Открыть
                  </NavLink>
                </div>
              </article>
            ))
          ) : (
            <div className="table-empty-state">Сейчас нет заказов, которые выглядят зависшими для директора.</div>
          )}
        </div>
      </section>
    </section>
  );
}

function PlatformOverviewPage({
  companies,
  subscriptions = [],
  demoRequests = [],
  subscriptionEvents = [],
  subscriptionSavingId = null,
  demoRequestSavingId = null,
  companyPackApplyingId = null,
  launchBundleSavingId = null,
  starterAccessCreatingId = null,
  starterAccessByCompany = {},
  accessibleCompanyIds = new Set(),
  onOpenCompany,
  onSaveCompanySubscription,
  onUpdateDemoRequestStatus,
  onCreateCompanyFromDemoRequest,
  onCreateManualPlatformLead,
  onApplyCompanyServicePack,
  onApplyPlatformLaunchBundle,
  onApplyPlatformFullLaunchBundle,
  onCreatePlatformStarterAccess,
  onCreatePlatformStarterBundle
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyAudienceFilter, setCompanyAudienceFilter] = useState("all");
  const [activeView, setActiveView] = useState("overview");
  const [demoStatusFilter, setDemoStatusFilter] = useState("all");
  const [demoAudienceFilter, setDemoAudienceFilter] = useState("real");
  const [demoSourceFilter, setDemoSourceFilter] = useState("all");
  const [demoActivationFilter, setDemoActivationFilter] = useState("all");
  const [focusedCompanyId, setFocusedCompanyId] = useState("");
  const [companyMode, setCompanyMode] = useState("attention");
  const [launchFilter, setLaunchFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [paidFilter, setPaidFilter] = useState("all");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [qaFilter, setQaFilter] = useState("all");
  const [companyHandoffFilter, setCompanyHandoffFilter] = useState("all");
  const [realOnboardingFilter, setRealOnboardingFilter] = useState("all");
  const [manualLeadSaving, setManualLeadSaving] = useState(false);
  const [manualLeadForm, setManualLeadForm] = useState({
    company_name: "",
    name: "",
    phone: "",
    owner_email: "",
    business_type: "detailing",
    plan: "basic"
  });
  const subscriptionsByCompanyId = useMemo(
    () => new Map(subscriptions.map((subscription) => [subscription.company_id, subscription])),
    [subscriptions]
  );
  const subscriptionEventsByCompanyId = useMemo(() => {
    const grouped = new Map();
    for (const event of subscriptionEvents) {
      if (!event?.company_id) {
        continue;
      }
      const current = grouped.get(event.company_id) || [];
      current.push(event);
      grouped.set(event.company_id, current);
    }
    return grouped;
  }, [subscriptionEvents]);
  const companiesById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);

  function getOverviewLaunchOptions(company, subscription, linkedDemoRequest = null) {
    const commerce = linkedDemoRequest ? getDemoRequestCommerceSnapshot(linkedDemoRequest) : null;
    const storefrontPlanId = String(commerce?.plan || "").trim().toLowerCase();
    const billingPeriod = commerce?.billing || "monthly";
    const planCode = storefrontPlanToCompanyPlan[storefrontPlanId] || subscription?.plan_code || company.plan_code || "starter";
    const recommendedPlanConfig = getStorefrontPlanConfig(storefrontPlanId, billingPeriod);
    const chargeSummary = getCommercialChargeSummary(recommendedPlanConfig, billingPeriod, subscription?.price_monthly ?? null);

    return {
      mode: "manual",
      plan_code: planCode,
      price_monthly: chargeSummary.monthlyEquivalent,
      requestId: linkedDemoRequest?.id || null
    };
  }

  function getOverviewCommercialContext(company, subscription, linkedDemoRequest = null, overrides = {}) {
    const commerce = linkedDemoRequest ? getDemoRequestCommerceSnapshot(linkedDemoRequest) : null;
    const storefrontPlanId = String(commerce?.plan || "").trim().toLowerCase();
    const latestCommercialPayload = getLatestCommercialPayload(subscriptionEventsByCompanyId.get(company.id) || []);
    const billingPeriod = normalizeStorefrontBillingInterval(
      overrides.billingPeriod || latestCommercialPayload.billing_period || commerce?.billing || "monthly"
    );
    const planCode = storefrontPlanToCompanyPlan[storefrontPlanId] || subscription?.plan_code || company.plan_code || "starter";
    const recommendedPlanConfig = getStorefrontPlanConfig(storefrontPlanId, billingPeriod);
    const chargeSummary = getCommercialChargeSummary(
      recommendedPlanConfig,
      billingPeriod,
      overrides.monthlyEquivalent ?? subscription?.price_monthly ?? latestCommercialPayload.mrr_equivalent ?? null
    );

    return {
      storefrontPlanId,
      billingPeriod,
      billingLabel: chargeSummary.billingLabel,
      planLabel: planLabels[planCode] || planCode || "Старт",
      businessLabel: businessTypeLabels[company.business_type] || "Автосервис",
      billingStatusLabel: formatBillingStatus(subscription?.billing_status || "trial"),
      chargeAmount:
        overrides.chargeAmount ??
        (latestCommercialPayload.charge_amount != null ? Number(latestCommercialPayload.charge_amount) : chargeSummary.chargeAmount),
      chargeSuffix: latestCommercialPayload.charge_suffix || chargeSummary.chargeSuffix,
      monthlyEquivalent:
        chargeSummary.monthlyEquivalent != null
          ? Number(chargeSummary.monthlyEquivalent)
          : latestCommercialPayload.mrr_equivalent != null
          ? Number(latestCommercialPayload.mrr_equivalent)
          : null,
      ownerName: latestCommercialPayload.owner_name || company.owner_name || linkedDemoRequest?.name || "",
      ownerPhone: latestCommercialPayload.owner_phone || company.contact_phone || linkedDemoRequest?.phone || "",
      ownerEmail: latestCommercialPayload.owner_email || company.owner_email || company.contact_email || "",
      paymentChannel: overrides.paymentChannel || latestCommercialPayload.payment_channel || "bank_transfer",
      paymentDueAt: overrides.paymentDueAt || latestCommercialPayload.payment_due_at || "",
      paymentNote: overrides.paymentNote || latestCommercialPayload.payment_note || "",
      requestId: linkedDemoRequest?.id || latestCommercialPayload.source_request_id || null,
      companyName: company.name,
      companyLoginUrl: `/login?company_slug=${encodeURIComponent(company.slug || "")}`,
      publicRequestUrl: `/request?company_slug=${encodeURIComponent(company.slug || "")}`,
      nextStep: overrides.nextStep || ""
    };
  }

  function buildOverviewSubscriptionPayload(company, subscription, linkedDemoRequest = null, overrides = {}) {
    const commerce = linkedDemoRequest ? getDemoRequestCommerceSnapshot(linkedDemoRequest) : null;
    const storefrontPlanId = String(commerce?.plan || "").trim().toLowerCase();
    const rawBillingPeriod = commerce?.billing || "monthly";
    const normalizedBillingPeriod = normalizeStorefrontBillingInterval(rawBillingPeriod);
    const planCode = storefrontPlanToCompanyPlan[storefrontPlanId] || subscription?.plan_code || company.plan_code || "starter";
    const recommendedPlanConfig = getStorefrontPlanConfig(storefrontPlanId, rawBillingPeriod);
    const chargeSummary = getCommercialChargeSummary(recommendedPlanConfig, rawBillingPeriod, subscription?.price_monthly ?? null);
    const isFreeMonth = String(rawBillingPeriod).trim().toLowerCase() === "free_month";
    const defaultBillingStatus = isFreeMonth ? "trial" : "manual";
    const defaultStartsAt = getNextIsoOffset(0);
    const defaultTrialEndsAt = isFreeMonth ? getNextIsoOffset(30) : null;
    const defaultRenewsAt = isFreeMonth ? null : normalizedBillingPeriod === "yearly" ? getNextIsoOffset(365) : getNextIsoOffset(30);
    const defaultEndsAt = normalizedBillingPeriod === "yearly" ? getNextIsoOffset(365) : getNextIsoOffset(45);

    return {
      status: company.status || "active",
      plan_code: planCode,
      billing_status: subscription?.billing_status || defaultBillingStatus,
      price_monthly: chargeSummary.monthlyEquivalent,
      starts_at: subscription?.starts_at ? formatDateTimeLocal(subscription.starts_at) : defaultStartsAt,
      trial_ends_at: subscription?.trial_ends_at ? formatDateTimeLocal(subscription.trial_ends_at) : defaultTrialEndsAt,
      renews_at: subscription?.renews_at
        ? formatDateTimeLocal(subscription.renews_at)
        : defaultRenewsAt,
      ends_at: subscription?.ends_at
        ? formatDateTimeLocal(subscription.ends_at)
        : defaultEndsAt,
      notes: subscription?.notes?.trim() || null,
      ...overrides
    };
  }

  async function bootstrapOverviewSubscription(company, subscription, linkedDemoRequest = null) {
    if (!company?.id) {
      return false;
    }

    const payload = buildOverviewSubscriptionPayload(company, subscription, linkedDemoRequest, {
      status: company.status === "archived" ? "paused" : company.status || "active"
    });

    return onSaveCompanySubscription?.(company.id, payload);
  }

  async function applyOverviewPaidAction(type, company, subscription, linkedDemoRequest = null) {
    if (!company?.id) {
      return false;
    }

    if (type === "bootstrap_subscription") {
      return bootstrapOverviewSubscription(company, subscription, linkedDemoRequest);
    }

    const notesPrefix = subscription?.notes?.trim() || "";
    const payload = buildOverviewSubscriptionPayload(company, subscription, linkedDemoRequest, {
      status: "active"
    });
    payload.event_payload_extra = buildCommercialEventPayloadExtra(
      getOverviewCommercialContext(company, subscription, linkedDemoRequest)
    );

    if (type === "prepare_manual") {
      payload.billing_status = "manual";
      payload.notes = [notesPrefix, "Creator: manual billing prepared"].filter(Boolean).join(" | ");
      payload.event_type_override = "manual_prepared";
      payload.event_note_override = "Creator prepared manual billing and owner payment pack.";
    }

    if (type === "invoice_sent") {
      payload.billing_status = "manual";
      payload.notes = [notesPrefix, "Creator: invoice sent to owner"].filter(Boolean).join(" | ");
      payload.event_type_override = "invoice_sent";
      payload.event_note_override = "Creator sent invoice / payment instructions to the owner.";
    }

    if (type === "confirm_paid") {
      payload.billing_status = "active";
      payload.notes = [notesPrefix, "Creator: first payment confirmed"].filter(Boolean).join(" | ");
      payload.event_type_override = "payment_confirmed";
      payload.event_note_override = "Creator confirmed first payment and activated paid billing.";
    }

    if (type === "pause_after_no_payment") {
      payload.status = "paused";
      payload.billing_status = "paused";
      payload.notes = [notesPrefix, "Creator: paused after no payment confirmation"].filter(Boolean).join(" | ");
      payload.event_type_override = "payment_paused";
      payload.event_note_override = "Creator paused the company after missing payment confirmation.";
    }

    return onSaveCompanySubscription?.(company.id, payload);
  }

  async function applyOverviewStatusAction(nextStatus, company, subscription, linkedDemoRequest = null) {
    if (!company?.id) {
      return false;
    }

    return onSaveCompanySubscription?.(
      company.id,
      buildOverviewSubscriptionPayload(company, subscription, linkedDemoRequest, {
        status: nextStatus
      })
    );
  }

  async function executePrimaryPaidAction(actionKey, item, linkedDemoRequest = null) {
    if (!item?.company?.id) {
      return false;
    }

    if (actionKey === "active") {
      return applyOverviewStatusAction("active", item.company, item.subscription, linkedDemoRequest);
    }

    if (actionKey === "starter_bundle") {
      return onCreatePlatformStarterBundle?.(item.company.id);
    }

    if (actionKey === "service_pack") {
      return onApplyCompanyServicePack?.(item.company.id, item.company.business_type || "detailing");
    }

    if (actionKey === "prepare_manual" || actionKey === "invoice_sent" || actionKey === "confirm_paid") {
      return applyOverviewPaidAction(actionKey, item.company, item.subscription, linkedDemoRequest);
    }

    if (actionKey === "ready_pack" || actionKey === "full_manual") {
      return onApplyPlatformFullLaunchBundle?.(
        item.company.id,
        getOverviewLaunchOptions(item.company, item.subscription, linkedDemoRequest)
      );
    }

    if (actionKey === "open_company") {
      setActiveView("companies");
      setCompanyMode("paid");
      setFocusedCompanyId(item.company.id);
      return true;
    }

    return false;
  }

  async function copyOverviewBillingPack(company, subscription, linkedDemoRequest = null, nextStep = "") {
    const lines = buildCommercialOperatorPackLines(
      getOverviewCommercialContext(company, subscription, linkedDemoRequest, { nextStep }),
      window.location.origin
    );

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(lines.join("\n"));
    }
  }

  async function copyOverviewOwnerBillingPack(company, subscription, linkedDemoRequest = null, nextStep = "") {
    const lines = buildCommercialOwnerPackLines(
      getOverviewCommercialContext(company, subscription, linkedDemoRequest, { nextStep }),
      window.location.origin
    );

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(lines.join("\n"));
    }
  }

  async function handleCreateManualLead(event) {
    event.preventDefault();

    if (!onCreateManualPlatformLead) {
      return;
    }

    setManualLeadSaving(true);

    try {
      const createdRequest = await onCreateManualPlatformLead({
        company_name: manualLeadForm.company_name,
        name: manualLeadForm.name,
        phone: manualLeadForm.phone,
        owner_email: manualLeadForm.owner_email,
        business_type: manualLeadForm.business_type,
        plan: manualLeadForm.plan
      });

      if (createdRequest?.id) {
        setDemoAudienceFilter("real");
        setRealOnboardingFilter("all");
        setManualLeadForm({
          company_name: "",
          name: "",
          phone: "",
          owner_email: "",
          business_type: "detailing",
          plan: "basic"
        });
      }
    } finally {
      setManualLeadSaving(false);
    }
  }

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return companies.filter((company) => {
      if (statusFilter !== "all" && company.status !== statusFilter) {
        return false;
      }

      if (companyAudienceFilter === "real" && company.is_demo) {
        return false;
      }

      if (companyAudienceFilter === "demo" && !company.is_demo) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        company.name,
        company.slug,
        company.contact_phone,
        company.contact_email,
        company.owner_name,
        company.owner_email,
        businessTypeLabels[company.business_type]
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [companies, companyAudienceFilter, search, statusFilter]);
  const totalCompanies = companies.length;
  const totalRealCompanies = companies.filter((company) => !company.is_demo).length;
  const totalDemoCompanies = companies.filter((company) => company.is_demo).length;
  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const pausedCompanies = companies.filter((company) => company.status === "paused").length;
  const archivedCompanies = companies.filter((company) => company.status === "archived").length;
  const trialCompanies = subscriptions.filter((subscription) => subscription.billing_status === "trial").length;
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.billing_status === "active").length;
  const manualSubscriptions = subscriptions.filter((subscription) => subscription.billing_status === "manual").length;
  const pausedSubscriptions = subscriptions.filter((subscription) => subscription.billing_status === "paused").length;
  const pastDueSubscriptions = subscriptions.filter((subscription) => subscription.billing_status === "past_due").length;
  const totalActiveMembers = companies.reduce((total, company) => total + Number(company.active_members_count || 0), 0);
  const totalClientsInPlatform = companies.reduce((total, company) => total + Number(company.clients_count || 0), 0);
  const totalLeadsInPlatform = companies.reduce((total, company) => total + Number(company.leads_count || 0), 0);
  const monthlyRecurringRevenue = subscriptions.reduce((total, subscription) => {
    if (subscription.billing_status !== "active" && subscription.billing_status !== "manual") {
      return total;
    }

    return total + Number(subscription.price_monthly || 0);
  }, 0);
  const monthlyRevenueAtRisk = subscriptions.reduce((total, subscription) => {
    if (subscription.billing_status !== "past_due" && subscription.billing_status !== "paused") {
      return total;
    }

    return total + Number(subscription.price_monthly || 0);
  }, 0);
  const paidCompaniesCount = activeSubscriptions + manualSubscriptions;
  const averageRevenuePerPaidCompany = paidCompaniesCount ? Math.round(monthlyRecurringRevenue / paidCompaniesCount) : 0;
  const trialEndingSoonCompanies = subscriptions.filter((subscription) => {
    if (subscription.billing_status !== "trial") {
      return false;
    }

    const daysLeft = getDaysUntil(subscription.trial_ends_at);
    return daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
  }).length;
  const expiredTrialCompanies = subscriptions.filter((subscription) => {
    if (subscription.billing_status !== "trial") {
      return false;
    }

    const daysLeft = getDaysUntil(subscription.trial_ends_at);
    return daysLeft != null && daysLeft < 0;
  }).length;
  const planSummary = useMemo(() => {
    const totals = new Map();

    for (const company of companies) {
      const subscription = subscriptionsByCompanyId.get(company.id);
      const planCode = subscription?.plan_code || company.plan_code || "starter";
      totals.set(planCode, (totals.get(planCode) || 0) + 1);
    }

    return Array.from(totals.entries()).map(([planCode, count]) => ({
      planCode,
      count
    }));
  }, [companies, subscriptionsByCompanyId]);
  const businessTypeSummary = useMemo(() => {
    const totals = new Map();

    for (const company of companies) {
      const businessType = company.business_type || "detailing";
      totals.set(businessType, (totals.get(businessType) || 0) + 1);
    }

    return Array.from(totals.entries()).map(([businessType, count]) => ({
      businessType,
      count
    }));
  }, [companies]);
  const recentSubscriptionEvents = useMemo(
    () =>
      subscriptionEvents
        .filter((event) => filteredCompanies.some((company) => company.id === event.company_id))
        .slice()
        .sort((left, right) => getComparableDate(right.created_at) - getComparableDate(left.created_at))
        .slice(0, 12),
    [subscriptionEvents, filteredCompanies]
  );
  const realDemoRequests = useMemo(() => demoRequests.filter((request) => !isQaDemoRequest(request)), [demoRequests]);
  const qaDemoRequests = useMemo(() => demoRequests.filter((request) => isQaDemoRequest(request)), [demoRequests]);
  const manualRealDemoRequests = useMemo(
    () => realDemoRequests.filter((request) => String(request.source || "").toLowerCase() === "manual"),
    [realDemoRequests]
  );
  const storefrontRealDemoRequests = useMemo(
    () => realDemoRequests.filter((request) => String(request.source || "").toLowerCase() === "landing"),
    [realDemoRequests]
  );
  const recentDemoRequests = useMemo(
    () => realDemoRequests.slice().sort((left, right) => getComparableDate(right.created_at) - getComparableDate(left.created_at)).slice(0, 10),
    [realDemoRequests]
  );
  const filteredDemoRequests = useMemo(
    () => {
      const source = demoAudienceFilter === "qa" ? qaDemoRequests : demoAudienceFilter === "real" ? realDemoRequests : demoRequests;

      return source
        .filter((request) => {
          if (demoSourceFilter === "all") {
            return true;
          }

          if (demoSourceFilter === "manual") {
            return String(request.source || "").toLowerCase() === "manual";
          }

          if (demoSourceFilter === "storefront") {
            return String(request.source || "").toLowerCase() === "landing";
          }

          return true;
        })
        .filter((request) => (demoStatusFilter === "all" ? true : request.status === demoStatusFilter))
        .filter((request) => {
          if (demoActivationFilter === "all") {
            return true;
          }

          const activation = getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId);

          if (demoActivationFilter === "activation") {
            return activation.stage !== "ready_check";
          }

          return activation.stage === demoActivationFilter;
        })
        .slice()
        .sort((left, right) => getComparableDate(right.created_at) - getComparableDate(left.created_at));
    },
    [companiesById, demoActivationFilter, demoAudienceFilter, demoRequests, demoSourceFilter, demoStatusFilter, qaDemoRequests, realDemoRequests, subscriptionsByCompanyId]
  );
  const demoRequestsByStatus = useMemo(
    () =>
      demoRequestStatusOptions.reduce((accumulator, status) => {
        accumulator[status] = filteredDemoRequests.filter((request) => (request.status || "new") === status);
        return accumulator;
      }, {}),
    [filteredDemoRequests]
  );
  const demoRequestSummary = useMemo(
    () => ({
      total: demoRequests.length,
      realCount: realDemoRequests.length,
      qaCount: qaDemoRequests.length,
      newCount: demoRequests.filter((request) => request.status === "new").length,
      contactedCount: demoRequests.filter((request) => request.status === "contacted").length,
      qualifiedCount: demoRequests.filter((request) => request.status === "qualified").length,
      connectedCount: demoRequests.filter((request) => request.status === "connected").length
    }),
    [demoRequests, qaDemoRequests.length, realDemoRequests.length]
  );
  const commercialSignals = [
    {
      title: "Платящий контур",
      value: `${paidCompaniesCount} компаний`,
      detail: `${platformEurFormatter.format(averageRevenuePerPaidCompany)} EUR средний чек по активной подписке`
    },
    {
      title: "Риск по выручке",
      value: `${platformEurFormatter.format(monthlyRevenueAtRisk)} EUR`,
      detail: `${pastDueSubscriptions} просрочек и ${pausedSubscriptions} пауз в биллинге`
    },
    {
      title: "Триалы на конверсии",
      value: `${trialEndingSoonCompanies} скоро заканчиваются`,
      detail: expiredTrialCompanies ? `${expiredTrialCompanies} уже вышли из триала` : "Просроченных триалов сейчас нет"
    },
    {
      title: "Демо-воронка",
      value: `${demoRequestSummary.qualifiedCount + demoRequestSummary.connectedCount} тёплых лидов`,
      detail: `${demoRequestSummary.newCount} новых, ${demoRequestSummary.contactedCount} в контакте, ${demoRequestSummary.connectedCount} уже подключены`
    }
  ];
  const billingSnapshot = useMemo(
    () => [
      {
        label: "Платящие",
        value: paidCompaniesCount,
        note: `${activeSubscriptions} active + ${manualSubscriptions} manual`
      },
      {
        label: "Просрочки",
        value: pastDueSubscriptions,
        note: `${platformEurFormatter.format(monthlyRevenueAtRisk)} EUR под риском`
      },
      {
        label: "Скоро renewal",
        value: subscriptions.filter((subscription) => {
          const daysLeft = getDaysUntil(subscription.renews_at);
          return subscription.billing_status === "active" && daysLeft != null && daysLeft >= 0 && daysLeft <= 14;
        }).length,
        note: "Следующие 14 дней"
      },
      {
        label: "Триалы на решении",
        value: trialEndingSoonCompanies + expiredTrialCompanies,
        note: expiredTrialCompanies ? `${expiredTrialCompanies} уже просрочены` : "Без просроченных"
      }
    ],
    [
      activeSubscriptions,
      expiredTrialCompanies,
      manualSubscriptions,
      monthlyRevenueAtRisk,
      paidCompaniesCount,
      pastDueSubscriptions,
      subscriptions,
      trialEndingSoonCompanies
    ]
  );
  const operationalQueue = useMemo(() => {
    return filteredCompanies
      .map((company) => {
        const subscription = subscriptionsByCompanyId.get(company.id) || null;
        const planCode = subscription?.plan_code || company.plan_code || "starter";
        const seatLimit = planSeatLimits[planCode];
        const activeMembersCount = Number(company.active_members_count || 0);
        const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
        const renewDaysLeft = getDaysUntil(subscription?.renews_at);
        const items = [];

        if (subscription?.billing_status === "past_due") {
          items.push("Связаться по просрочке");
        }

        if (subscription?.billing_status === "trial" && trialDaysLeft != null && trialDaysLeft <= 7) {
          items.push(trialDaysLeft < 0 ? "Триал истёк: принять решение" : "Триал скоро закончится");
        }

        if (subscription?.billing_status === "active" && renewDaysLeft != null && renewDaysLeft >= 0 && renewDaysLeft <= 14) {
          items.push("Проверить продление");
        }

        if (seatLimit != null && activeMembersCount > seatLimit) {
          items.push("Предложить апгрейд по лимиту");
        }

        if (company.status === "paused") {
          items.push("Решить по активации компании");
        }

        if (!company.owner_email) {
          items.push("Дособрать контакты владельца");
        }

        return {
          company,
          subscription,
          priority: items.length,
          items: items.slice(0, 3)
        };
      })
      .filter((item) => item.priority > 0)
      .sort((left, right) => right.priority - left.priority)
      .slice(0, 6);
  }, [filteredCompanies, subscriptionsByCompanyId]);
  const renewalRadar = useMemo(() => {
    return filteredCompanies
      .map((company) => {
        const subscription = subscriptionsByCompanyId.get(company.id) || null;
        const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
        const renewDaysLeft = getDaysUntil(subscription?.renews_at);

        if (subscription?.billing_status === "trial" && trialDaysLeft != null && trialDaysLeft <= 14) {
          return {
            company,
            kind: trialDaysLeft < 0 ? "trial_expired" : "trial",
            daysLeft: trialDaysLeft,
            date: subscription?.trial_ends_at
          };
        }

        if (subscription?.billing_status === "active" && renewDaysLeft != null && renewDaysLeft <= 21) {
          return {
            company,
            kind: "renewal",
            daysLeft: renewDaysLeft,
            date: subscription?.renews_at
          };
        }

        return null;
      })
      .filter(Boolean)
      .sort((left, right) => (left.daysLeft || 0) - (right.daysLeft || 0))
      .slice(0, 8);
  }, [filteredCompanies, subscriptionsByCompanyId]);
  const subscriptionHealthRows = useMemo(() => {
    return filteredCompanies.map((company) => {
      const subscription = subscriptionsByCompanyId.get(company.id) || null;
      const planCode = subscription?.plan_code || company.plan_code || "starter";
      const seatLimit = planSeatLimits[planCode];
      const activeMembersCount = Number(company.active_members_count || 0);
      const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
      const renewDaysLeft = getDaysUntil(subscription?.renews_at);
      const needsAction =
        subscription?.billing_status === "past_due" ||
        subscription?.billing_status === "paused" ||
        (subscription?.billing_status === "trial" && trialDaysLeft != null && trialDaysLeft <= 7) ||
        (subscription?.billing_status === "active" && renewDaysLeft != null && renewDaysLeft <= 14) ||
        (seatLimit != null && activeMembersCount > seatLimit);

      return {
        company,
        subscription,
        planCode,
        seatLimit,
        activeMembersCount,
        trialDaysLeft,
        renewDaysLeft,
        needsAction
      };
    });
  }, [filteredCompanies, subscriptionsByCompanyId]);
  const demoConversionQueue = useMemo(() => {
    return realDemoRequests
      .filter((request) => ["qualified", "contacted"].includes(request.status || "new"))
      .slice()
      .sort((left, right) => getComparableDate(right.created_at) - getComparableDate(left.created_at))
      .slice(0, 6);
  }, [realDemoRequests]);
  const demoLinkedCompaniesCount = realDemoRequests.filter((request) => Boolean(request.connected_company_id)).length;
  const demoActivationQueue = useMemo(() => {
    return realDemoRequests
      .map((request) => {
        const activation = getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId);

        return {
          request,
          ...activation
        };
      })
      .filter((item) => (item.request.status || "new") !== "archived")
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }

        return getComparableDate(right.request.created_at) - getComparableDate(left.request.created_at);
        })
      .slice(0, 6);
  }, [companiesById, realDemoRequests, subscriptionsByCompanyId]);
  const firstRealOnboardingCandidate = demoActivationQueue[0] || null;
  const latestDemoRequestByCompanyId = useMemo(() => {
    const entries = demoRequests
      .filter((request) => Boolean(request.connected_company_id))
      .slice()
      .sort((left, right) => getComparableDate(right.created_at) - getComparableDate(left.created_at));
    const map = new Map();

    for (const request of entries) {
      if (!map.has(request.connected_company_id)) {
        map.set(request.connected_company_id, request);
      }
    }

    return map;
  }, [demoRequests]);
  const demoActivationSummary = useMemo(
    () => ({
      unlinked: realDemoRequests.filter((request) => getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId).stage === "unlinked").length,
      noSubscription: realDemoRequests.filter((request) => getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId).stage === "no_subscription").length,
      planMismatch: realDemoRequests.filter((request) => getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId).stage === "plan_mismatch").length,
      companyInactive: realDemoRequests.filter((request) => getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId).stage === "company_inactive").length,
      activationNeeded: realDemoRequests.filter((request) => getDemoRequestActivationState(request, companiesById, subscriptionsByCompanyId).stage !== "ready_check").length
    }),
    [companiesById, realDemoRequests, subscriptionsByCompanyId]
  );
  const companyHandoffRows = useMemo(() => {
    return filteredCompanies
      .map((company) => {
        const linkedDemoRequest = latestDemoRequestByCompanyId.get(company.id) || null;

        if (!linkedDemoRequest) {
          return null;
        }

        const activation = getDemoRequestActivationState(linkedDemoRequest, companiesById, subscriptionsByCompanyId);
        return {
          company,
          linkedDemoRequest,
          activation
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.activation.priority - left.activation.priority || getComparableDate(right.linkedDemoRequest.created_at) - getComparableDate(left.linkedDemoRequest.created_at));
  }, [companiesById, filteredCompanies, latestDemoRequestByCompanyId, subscriptionsByCompanyId]);
  const filteredCompanyHandoffRows = useMemo(() => {
    if (companyHandoffFilter === "all") {
      return companyHandoffRows;
    }

    if (companyHandoffFilter === "action") {
      return companyHandoffRows.filter((item) => item.activation.stage !== "ready_check");
    }

    return companyHandoffRows.filter((item) => item.activation.stage === companyHandoffFilter);
  }, [companyHandoffFilter, companyHandoffRows]);
  const companyHandoffSummary = useMemo(
    () => ({
      total: companyHandoffRows.length,
      action: companyHandoffRows.filter((item) => item.activation.stage !== "ready_check").length,
      noSubscription: companyHandoffRows.filter((item) => item.activation.stage === "no_subscription").length,
      planMismatch: companyHandoffRows.filter((item) => item.activation.stage === "plan_mismatch").length,
      companyInactive: companyHandoffRows.filter((item) => item.activation.stage === "company_inactive").length,
      notConnected: companyHandoffRows.filter((item) => item.activation.stage === "not_connected").length
    }),
    [companyHandoffRows]
  );
  const attentionCompanies = useMemo(() => {
    return filteredCompanies
      .map((company) => {
        const subscription = subscriptionsByCompanyId.get(company.id) || null;
        const planCode = subscription?.plan_code || company.plan_code || "starter";
        const seatLimit = planSeatLimits[planCode];
        const activeMembersCount = Number(company.active_members_count || 0);
        const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
        const reasons = [];

        if (seatLimit != null && activeMembersCount > seatLimit) {
          reasons.push(`Превышен лимит тарифа: ${activeMembersCount} из ${seatLimit} сотрудников`);
        }

        if (subscription?.billing_status === "past_due") {
          reasons.push("Есть просрочка по оплате");
        }

        if (subscription?.billing_status === "paused") {
          reasons.push("Подписка стоит на паузе");
        }

        if (subscription?.billing_status === "trial" && trialDaysLeft != null && trialDaysLeft <= 7) {
          reasons.push(
            trialDaysLeft < 0
              ? "Триал уже закончился"
              : trialDaysLeft === 0
              ? "Триал заканчивается сегодня"
              : `Триал закончится через ${trialDaysLeft} дн.`
          );
        }

        if (!company.owner_email) {
          reasons.push("У компании не указана почта владельца");
        }

        return {
          company,
          subscription,
          reasons
        };
      })
      .filter((item) => item.reasons.length)
      .slice(0, 8);
  }, [filteredCompanies, subscriptionsByCompanyId]);
  const multiCompanyQaRows = useMemo(() => {
    return filteredCompanies
      .map((company) => {
        const subscription = subscriptionsByCompanyId.get(company.id) || null;
        const linkedDemoRequest = latestDemoRequestByCompanyId.get(company.id) || null;
        const activation = linkedDemoRequest ? getDemoRequestActivationState(linkedDemoRequest, companiesById, subscriptionsByCompanyId) : null;
        return getCompanyQaRecord({ company, subscription, activation });
      })
      .sort((left, right) => right.severityScore - left.severityScore || getComparableDate(right.company.created_at) - getComparableDate(left.company.created_at));
  }, [companiesById, filteredCompanies, latestDemoRequestByCompanyId, subscriptionsByCompanyId]);
  const qaSummary = useMemo(
    () => ({
      total: multiCompanyQaRows.length,
      critical: multiCompanyQaRows.filter((item) => item.severity === "critical").length,
      warning: multiCompanyQaRows.filter((item) => item.severity === "warning").length,
      ok: multiCompanyQaRows.filter((item) => item.severity === "ok").length,
      handoffOpen: multiCompanyQaRows.filter((item) => item.activation && item.activation.stage !== "ready_check").length,
      noServices: multiCompanyQaRows.filter((item) => item.company.status === "active" && Number(item.company.services_count || 0) === 0).length
    }),
    [multiCompanyQaRows]
  );
  const qaPriorityRows = useMemo(() => multiCompanyQaRows.filter((item) => item.issues.length).slice(0, 8), [multiCompanyQaRows]);
  const paidOnboardingRows = useMemo(() => {
    const commercialStageRank = {
      invoice_sent: 4,
      manual_prepared: 3,
      not_started: 2,
      payment_paused: 1,
      payment_confirmed: 0
    };

    return filteredCompanies
      .map((company) => {
        const subscription = subscriptionsByCompanyId.get(company.id) || null;
        const linkedDemoRequest = latestDemoRequestByCompanyId.get(company.id) || null;
        const activation = linkedDemoRequest ? getDemoRequestActivationState(linkedDemoRequest, companiesById, subscriptionsByCompanyId) : null;
        const paidRecord = getPaidReadinessRecord({ company, subscription, activation });
        return {
          ...paidRecord,
          commercialStage: getCommercialCloseStage(subscription, subscriptionEventsByCompanyId.get(company.id) || [])
        };
      })
      .sort((left, right) => {
        const leftRank = left.readiness === "ready_for_paid" ? 3 : left.readiness === "almost_ready" ? 2 : left.readiness === "blocked" ? 1 : 0;
        const rightRank = right.readiness === "ready_for_paid" ? 3 : right.readiness === "almost_ready" ? 2 : right.readiness === "blocked" ? 1 : 0;
        return (
          Number(left.company.is_demo) - Number(right.company.is_demo) ||
          rightRank - leftRank ||
          (commercialStageRank[right.commercialStage] || 0) - (commercialStageRank[left.commercialStage] || 0) ||
          left.goLive.unresolvedCount - right.goLive.unresolvedCount ||
          getComparableDate(right.company.created_at) - getComparableDate(left.company.created_at)
        );
      });
  }, [companiesById, filteredCompanies, latestDemoRequestByCompanyId, subscriptionEventsByCompanyId, subscriptionsByCompanyId]);
  const paidOnboardingSummary = useMemo(
    () => ({
      ready: paidOnboardingRows.filter((item) => item.paidReady).length,
      almostReady: paidOnboardingRows.filter((item) => !item.paidReady && item.goLive.readiness === "almost_ready").length,
      blocked: paidOnboardingRows.filter((item) => item.goLive.readiness === "blocked").length,
      manual: paidOnboardingRows.filter((item) => item.billingStatus === "manual").length,
      notStarted: paidOnboardingRows.filter((item) => item.commercialStage === "not_started").length,
      manualPrepared: paidOnboardingRows.filter((item) => item.commercialStage === "manual_prepared").length,
      invoiceSent: paidOnboardingRows.filter((item) => item.commercialStage === "invoice_sent").length,
      paymentPaused: paidOnboardingRows.filter((item) => item.commercialStage === "payment_paused").length,
      trial: paidOnboardingRows.filter((item) => item.billingStatus === "trial").length,
      pastDue: paidOnboardingRows.filter((item) => item.billingStatus === "past_due").length
    }),
    [paidOnboardingRows]
  );
  const realPaidOnboardingRows = useMemo(() => paidOnboardingRows.filter((item) => !item.company.is_demo), [paidOnboardingRows]);
  const demoPaidOnboardingRows = useMemo(() => paidOnboardingRows.filter((item) => item.company.is_demo), [paidOnboardingRows]);
  const paidOnboardingByCompanyId = useMemo(
    () => new Map(paidOnboardingRows.map((item) => [item.company.id, item])),
    [paidOnboardingRows]
  );
  const firstRealOnboardingLaunchRecord = useMemo(() => {
    if (!firstRealOnboardingCandidate?.linkedCompany?.id) {
      return null;
    }

    return paidOnboardingByCompanyId.get(firstRealOnboardingCandidate.linkedCompany.id) || null;
  }, [firstRealOnboardingCandidate, paidOnboardingByCompanyId]);
  const firstRealOnboardingPrimaryAction = firstRealOnboardingLaunchRecord
    ? getPrimaryPaidActionConfig(firstRealOnboardingLaunchRecord)
    : null;
  const realOnboardingRows = useMemo(() => {
    return realDemoRequests
      .filter((request) => (request.status || "new") !== "archived")
      .map((request) =>
        getRealOnboardingRecord({
          request,
          companiesById,
          subscriptionsByCompanyId,
          subscriptionEventsByCompanyId
        })
      )
      .sort((left, right) => right.priority - left.priority || getComparableDate(right.request.created_at) - getComparableDate(left.request.created_at));
  }, [companiesById, realDemoRequests, subscriptionEventsByCompanyId, subscriptionsByCompanyId]);
  const realOnboardingSummary = useMemo(
    () => ({
      total: realOnboardingRows.length,
      action: realOnboardingRows.filter((item) => item.requiresAction).length,
      followUp: realOnboardingRows.filter((item) => item.followUpState === "overdue" || item.followUpState === "today").length,
      noCompany: realOnboardingRows.filter((item) => item.queueKey === "company").length,
      needsSubscription: realOnboardingRows.filter((item) => item.queueKey === "subscription" || item.queueKey === "plan").length,
      launchPrep: realOnboardingRows.filter((item) => item.queueKey === "launch" || item.queueKey === "activation" || item.queueKey === "handoff_close").length,
      commercial: realOnboardingRows.filter((item) => ["commercial", "invoice_send", "invoice_followup", "payment_paused"].includes(item.queueKey)).length,
      ready: realOnboardingRows.filter((item) => item.queueKey === "paid_ready").length,
      manual: realOnboardingRows.filter((item) => String(item.request.source || "").toLowerCase() === "manual").length,
      storefront: realOnboardingRows.filter((item) => String(item.request.source || "").toLowerCase() === "landing").length,
      freeMonth: realOnboardingRows.filter((item) => String(item.activation?.commerce?.billing || "").toLowerCase() === "free_month").length
    }),
    [realOnboardingRows]
  );
  const filteredRealOnboardingRows = useMemo(() => {
    if (realOnboardingFilter === "all") {
      return realOnboardingRows;
    }

    if (realOnboardingFilter === "action") {
      return realOnboardingRows.filter((item) => item.requiresAction);
    }

    if (realOnboardingFilter === "follow_up") {
      return realOnboardingRows.filter((item) => item.followUpState === "overdue" || item.followUpState === "today");
    }

    if (realOnboardingFilter === "company") {
      return realOnboardingRows.filter((item) => item.queueKey === "company");
    }

    if (realOnboardingFilter === "subscription") {
      return realOnboardingRows.filter((item) => item.queueKey === "subscription" || item.queueKey === "plan");
    }

    if (realOnboardingFilter === "launch") {
      return realOnboardingRows.filter((item) => item.queueKey === "launch" || item.queueKey === "activation" || item.queueKey === "handoff_close");
    }

    if (realOnboardingFilter === "commercial") {
      return realOnboardingRows.filter((item) => ["commercial", "invoice_send", "invoice_followup", "payment_paused"].includes(item.queueKey));
    }

    if (realOnboardingFilter === "ready") {
      return realOnboardingRows.filter((item) => item.queueKey === "paid_ready");
    }

    if (realOnboardingFilter === "manual") {
      return realOnboardingRows.filter((item) => String(item.request.source || "").toLowerCase() === "manual");
    }

    if (realOnboardingFilter === "storefront") {
      return realOnboardingRows.filter((item) => String(item.request.source || "").toLowerCase() === "landing");
    }

    if (realOnboardingFilter === "free_month") {
      return realOnboardingRows.filter((item) => String(item.activation?.commerce?.billing || "").toLowerCase() === "free_month");
    }

    return realOnboardingRows;
  }, [realOnboardingFilter, realOnboardingRows]);
  const realOnboardingQueueRows = useMemo(() => filteredRealOnboardingRows.slice(0, 8), [filteredRealOnboardingRows]);
  const realPaidWaitingRows = useMemo(() => realPaidOnboardingRows.filter((item) => !item.paidReady), [realPaidOnboardingRows]);
  const realPaidOnboardingSummary = useMemo(
    () => ({
      total: realPaidOnboardingRows.length,
      waiting: realPaidWaitingRows.length,
      almostReady: realPaidWaitingRows.filter((item) => item.goLive.readiness === "almost_ready").length,
      blocked: realPaidWaitingRows.filter((item) => item.goLive.readiness === "blocked").length,
      manualPrepared: realPaidWaitingRows.filter((item) => item.commercialStage === "manual_prepared").length,
      invoiceSent: realPaidWaitingRows.filter((item) => item.commercialStage === "invoice_sent").length
    }),
    [realPaidOnboardingRows, realPaidWaitingRows]
  );
  const paidOnboardingPriorityRows = useMemo(() => {
    return paidOnboardingRows
      .filter((item) => item.paidReady || item.goLive.readiness === "almost_ready" || item.billingStatus === "past_due")
      .slice(0, 8);
  }, [paidOnboardingRows]);
  const filteredPaidOnboardingRows = useMemo(() => {
    if (paidFilter === "all") {
      return paidOnboardingRows.filter((item) => !item.paidReady);
    }

    if (paidFilter === "almost_ready") {
      return paidOnboardingRows.filter((item) => !item.paidReady && item.goLive.readiness === "almost_ready");
    }

    if (paidFilter === "billing_only") {
      return paidOnboardingRows.filter((item) => !item.paidReady && item.blockers.length === 1 && item.blockers[0]?.sourceKey === "billing");
    }

    if (paidFilter === "not_started") {
      return paidOnboardingRows.filter((item) => !item.paidReady && item.commercialStage === "not_started");
    }

    if (paidFilter === "manual_prepared") {
      return paidOnboardingRows.filter((item) => !item.paidReady && item.commercialStage === "manual_prepared");
    }

    if (paidFilter === "invoice_sent") {
      return paidOnboardingRows.filter((item) => !item.paidReady && item.commercialStage === "invoice_sent");
    }

    if (paidFilter === "payment_paused") {
      return paidOnboardingRows.filter((item) => !item.paidReady && item.commercialStage === "payment_paused");
    }

    if (paidFilter === "ready_pack") {
      return paidOnboardingRows.filter((item) => !item.paidReady && item.readyPackEligible);
    }

    if (paidFilter === "blocked") {
      return paidOnboardingRows.filter((item) => !item.paidReady && item.goLive.readiness === "blocked");
    }

    return paidOnboardingRows.filter((item) => !item.paidReady);
  }, [paidFilter, paidOnboardingRows]);
  const filteredPaidOnboardingSummary = useMemo(
    () => ({
      total: filteredPaidOnboardingRows.length,
      almostReady: filteredPaidOnboardingRows.filter((item) => item.goLive.readiness === "almost_ready").length,
      blocked: filteredPaidOnboardingRows.filter((item) => item.goLive.readiness === "blocked").length,
      billingOnly: filteredPaidOnboardingRows.filter((item) => item.blockers.length === 1 && item.blockers[0]?.sourceKey === "billing").length,
      notStarted: filteredPaidOnboardingRows.filter((item) => item.commercialStage === "not_started").length,
      manualPrepared: filteredPaidOnboardingRows.filter((item) => item.commercialStage === "manual_prepared").length,
      invoiceSent: filteredPaidOnboardingRows.filter((item) => item.commercialStage === "invoice_sent").length,
      paymentPaused: filteredPaidOnboardingRows.filter((item) => item.commercialStage === "payment_paused").length,
      readyPack: filteredPaidOnboardingRows.filter((item) => item.readyPackEligible).length
    }),
    [filteredPaidOnboardingRows]
  );
  const filteredPaidCandidate = filteredPaidOnboardingRows[0] || null;
  const filteredPaidPrimaryAction = filteredPaidCandidate ? getPrimaryPaidActionConfig(filteredPaidCandidate) : null;
  const paidOrderByCompanyId = useMemo(
    () => new Map(filteredPaidOnboardingRows.map((item, index) => [item.company.id, index + 1])),
    [filteredPaidOnboardingRows]
  );
  const commercialCloseRows = useMemo(() => paidOnboardingRows.filter((item) => !item.paidReady).slice(0, 8), [paidOnboardingRows]);
  const commercialCloseSummary = useMemo(
    () => ({
      billingOnly: commercialCloseRows.filter((item) => item.blockers.length === 1 && item.blockers[0]?.sourceKey === "billing").length,
      companyInactive: commercialCloseRows.filter((item) => item.blockers.some((blocker) => blocker.sourceKey === "company_status")).length,
      teamMissing: commercialCloseRows.filter((item) => item.blockers.some((blocker) => blocker.sourceKey === "members")).length,
      billingOpen: commercialCloseRows.filter((item) => item.manualBillingRecommended).length,
      readyPackEligible: commercialCloseRows.filter((item) => item.readyPackEligible).length
    }),
    [commercialCloseRows]
  );
  const firstPaidLaunchCandidate = useMemo(() => selectFirstPaidLaunchCandidate(paidOnboardingRows), [paidOnboardingRows]);
  const firstPaidLaunchPrimaryAction = firstPaidLaunchCandidate ? getPrimaryPaidActionConfig(firstPaidLaunchCandidate) : null;
  const firstRealPaidLaunchCandidate = useMemo(() => selectFirstPaidLaunchCandidate(realPaidOnboardingRows), [realPaidOnboardingRows]);
  const firstRealPaidLaunchPrimaryAction = firstRealPaidLaunchCandidate ? getPrimaryPaidActionConfig(firstRealPaidLaunchCandidate) : null;
  const firstDemoPaidLaunchCandidate = useMemo(() => selectFirstPaidLaunchCandidate(demoPaidOnboardingRows), [demoPaidOnboardingRows]);
  const commercialCloseQueues = useMemo(() => {
    const queueConfigs = [
      {
        key: "billing_only",
        title: "Только billing",
        note: "Можно быстро закрывать в оплату без долгой подготовки.",
        accent: "ready",
        items: paidOnboardingRows.filter((item) => !item.paidReady && item.blockers.length === 1 && item.blockers[0]?.sourceKey === "billing")
      },
      {
        key: "company_status",
        title: "Перевести в active",
        note: "Контур почти собран, но компания ещё не включена как рабочая.",
        accent: "risk",
        items: paidOnboardingRows.filter((item) => !item.paidReady && item.blockers.some((blocker) => blocker.sourceKey === "company_status"))
      },
      {
        key: "members",
        title: "Досбор команды",
        note: "Нужно выдать owner / manager / master, чтобы запуск не висел на одном человеке.",
        accent: "team",
        items: paidOnboardingRows.filter((item) => !item.paidReady && item.blockers.some((blocker) => blocker.sourceKey === "members"))
      },
      {
        key: "services",
        title: "Пакет услуг",
        note: "Компания уже есть, но creator ещё не загрузил рабочий сервисный набор.",
        accent: "services",
        items: paidOnboardingRows.filter((item) => !item.paidReady && item.blockers.some((blocker) => blocker.sourceKey === "services"))
      }
    ];

    return queueConfigs
      .map((queue) => ({
        ...queue,
        count: queue.items.length,
        preview: queue.items.slice(0, 3)
      }))
      .filter((queue) => queue.count > 0);
  }, [paidOnboardingRows]);
  const commercialStageQueues = useMemo(() => {
    const queueConfigs = [
      {
        key: "not_started",
        title: "Не начато",
        note: "Компания уже в paid close, но creator ещё не собрал manual billing шаг.",
        accent: "fresh",
        items: paidOnboardingRows.filter((item) => !item.paidReady && item.commercialStage === "not_started")
      },
      {
        key: "manual_prepared",
        title: "Manual prepared",
        note: "Сумма и пакет уже собраны, следующий шаг: отправить счёт владельцу.",
        accent: "prepared",
        items: paidOnboardingRows.filter((item) => !item.paidReady && item.commercialStage === "manual_prepared")
      },
      {
        key: "invoice_sent",
        title: "Invoice sent",
        note: "Счёт уже отправлен, теперь важно быстро дожать до оплаты и активации.",
        accent: "sent",
        items: paidOnboardingRows.filter((item) => !item.paidReady && item.commercialStage === "invoice_sent")
      },
      {
        key: "payment_paused",
        title: "Пауза после оплаты",
        note: "Компания зависла после паузы или без подтверждения. Нужен creator follow-up.",
        accent: "paused",
        items: paidOnboardingRows.filter((item) => !item.paidReady && item.commercialStage === "payment_paused")
      }
    ];

    return queueConfigs
      .map((queue) => ({
        ...queue,
        count: queue.items.length,
        preview: queue.items.slice(0, 3)
      }))
      .filter((queue) => queue.count > 0);
  }, [paidOnboardingRows]);
  const launchPipelineRows = useMemo(() => {
    return paidOnboardingRows
      .map((item) => ({
        ...item,
        lane: getGoLiveLane(item.company, item.subscription, item.activation, item.goLive)
      }))
      .sort((left, right) => {
        const laneRank = {
          ready: 6,
          billing: 5,
          handoff: 4,
          owner: 3,
          team: 2,
          services: 1,
          activation: 1,
          steady: 0
        };

        return (
          (laneRank[right.lane.key] || 0) - (laneRank[left.lane.key] || 0) ||
          left.goLive.unresolvedCount - right.goLive.unresolvedCount ||
          getComparableDate(right.company.created_at) - getComparableDate(left.company.created_at)
        );
      });
  }, [paidOnboardingRows]);
  const launchPipelineSummary = useMemo(
    () => ({
      handoff: launchPipelineRows.filter((item) => item.lane.key === "handoff").length,
      owner: launchPipelineRows.filter((item) => item.lane.key === "owner").length,
      team: launchPipelineRows.filter((item) => item.lane.key === "team").length,
      services: launchPipelineRows.filter((item) => item.lane.key === "services").length,
      billing: launchPipelineRows.filter((item) => item.lane.key === "billing").length,
      activation: launchPipelineRows.filter((item) => item.lane.key === "activation").length,
      ready: launchPipelineRows.filter((item) => item.lane.key === "ready").length
    }),
    [launchPipelineRows]
  );
  const launchPipelinePriorityRows = useMemo(() => launchPipelineRows.filter((item) => item.lane.key !== "steady").slice(0, 10), [launchPipelineRows]);
  const filteredLaunchPipelineRows = useMemo(() => {
    if (launchFilter === "all") {
      return launchPipelineRows.filter((item) => item.lane.key !== "steady");
    }

    if (launchFilter === "services_activation") {
      return launchPipelineRows.filter((item) => item.lane.key === "services" || item.lane.key === "activation");
    }

    return launchPipelineRows.filter((item) => item.lane.key === launchFilter);
  }, [launchFilter, launchPipelineRows]);
  const filteredLaunchPipelineSummary = useMemo(
    () => ({
      total: filteredLaunchPipelineRows.length,
      handoff: filteredLaunchPipelineRows.filter((item) => item.lane.key === "handoff").length,
      owner: filteredLaunchPipelineRows.filter((item) => item.lane.key === "owner").length,
      team: filteredLaunchPipelineRows.filter((item) => item.lane.key === "team").length,
      billing: filteredLaunchPipelineRows.filter((item) => item.lane.key === "billing").length,
      ready: filteredLaunchPipelineRows.filter((item) => item.lane.key === "ready").length
    }),
    [filteredLaunchPipelineRows]
  );
  const creatorControlRows = useMemo(() => {
    return filteredCompanies
      .map((company) => {
        const subscription = subscriptionsByCompanyId.get(company.id) || null;
        const linkedDemoRequest = latestDemoRequestByCompanyId.get(company.id) || null;
        const activation = linkedDemoRequest ? getDemoRequestActivationState(linkedDemoRequest, companiesById, subscriptionsByCompanyId) : null;
        const qaRecord = multiCompanyQaRows.find((item) => item.company.id === company.id) || null;
        const launchRecord = paidOnboardingRows.find((item) => item.company.id === company.id) || null;
        const control = getCreatorControlState(company, subscription, activation, qaRecord, launchRecord?.goLive || null);

        return {
          company,
          subscription,
          activation,
          qaRecord,
          launchRecord,
          control
        };
      })
      .sort((left, right) => right.control.priority - left.control.priority || getComparableDate(right.company.created_at) - getComparableDate(left.company.created_at));
  }, [companiesById, filteredCompanies, latestDemoRequestByCompanyId, multiCompanyQaRows, paidOnboardingRows, subscriptionsByCompanyId]);
  const creatorControlSummary = useMemo(
    () => ({
      autopilot: creatorControlRows.filter((item) => item.control.bucket === "autopilot").length,
      billing: creatorControlRows.filter((item) => item.control.bucket === "billing").length,
      onboarding: creatorControlRows.filter((item) => item.control.bucket === "onboarding").length,
      ready: creatorControlRows.filter((item) => item.control.bucket === "ready").length,
      qa: creatorControlRows.filter((item) => item.control.bucket === "qa").length
    }),
    [creatorControlRows]
  );
  const creatorDailyQueue = useMemo(() => creatorControlRows.filter((item) => item.control.bucket !== "autopilot").slice(0, 10), [creatorControlRows]);
  const autopilotCompanies = useMemo(() => creatorControlRows.filter((item) => item.control.bucket === "autopilot").map((item) => item.company), [creatorControlRows]);
  const billingControlCompanies = useMemo(() => creatorControlRows.filter((item) => item.control.bucket === "billing").map((item) => item.company), [creatorControlRows]);
  const billingControlRows = useMemo(() => {
    return creatorControlRows
      .filter((item) => item.control.bucket === "billing")
      .filter((item) => {
        if (billingFilter === "all") {
          return true;
        }

        const billingStatus = item.subscription?.billing_status || "none";
        const renewDaysLeft = getDaysUntil(item.subscription?.renews_at);

        if (billingFilter === "renewal") {
          return (billingStatus === "active" || billingStatus === "manual") && renewDaysLeft != null && renewDaysLeft >= 0 && renewDaysLeft <= 14;
        }

        return billingStatus === billingFilter;
      });
  }, [billingFilter, creatorControlRows]);
  const billingControlSummary = useMemo(
    () => ({
      total: billingControlRows.length,
      pastDue: billingControlRows.filter((item) => item.subscription?.billing_status === "past_due").length,
      paused: billingControlRows.filter((item) => item.subscription?.billing_status === "paused").length,
      trial: billingControlRows.filter((item) => item.subscription?.billing_status === "trial").length,
      renewal: billingControlRows.filter((item) => {
        const renewDaysLeft = getDaysUntil(item.subscription?.renews_at);
        const billingStatus = item.subscription?.billing_status || "none";
        return (billingStatus === "active" || billingStatus === "manual") && renewDaysLeft != null && renewDaysLeft >= 0 && renewDaysLeft <= 14;
      }).length
    }),
    [billingControlRows]
  );
  const filteredQaRows = useMemo(() => {
    return multiCompanyQaRows
      .filter((item) => item.issues.length)
      .filter((item) => {
        if (qaFilter === "all") {
          return true;
        }

        if (qaFilter === "critical" || qaFilter === "warning") {
          return item.severity === qaFilter;
        }

        if (qaFilter === "handoff") {
          return Boolean(item.activation && item.activation.stage !== "ready_check");
        }

        if (qaFilter === "owner") {
          return item.issues.some((issue) => issue.includes("Owner") || issue.includes("owner"));
        }

        if (qaFilter === "services") {
          return item.issues.some((issue) => issue.includes("услуг"));
        }

        if (qaFilter === "billing") {
          return item.issues.some((issue) => issue.includes("past_due") || issue.includes("Trial") || issue.includes("подпис"));
        }

        return true;
      });
  }, [multiCompanyQaRows, qaFilter]);
  const filteredQaSummary = useMemo(
    () => ({
      total: filteredQaRows.length,
      critical: filteredQaRows.filter((item) => item.severity === "critical").length,
      warning: filteredQaRows.filter((item) => item.severity === "warning").length,
      handoff: filteredQaRows.filter((item) => item.activation && item.activation.stage !== "ready_check").length,
      owner: filteredQaRows.filter((item) => item.issues.some((issue) => issue.includes("Owner") || issue.includes("owner"))).length
    }),
    [filteredQaRows]
  );
  const attentionCompanyIds = useMemo(() => new Set(attentionCompanies.map((item) => item.company.id)), [attentionCompanies]);
  const recentCompanies = useMemo(() => {
    return filteredCompanies
      .slice()
      .sort(
        (left, right) =>
          getComparableDate(right.owner_connected_at || right.created_at) - getComparableDate(left.owner_connected_at || left.created_at)
      )
      .slice(0, 16);
  }, [filteredCompanies]);
  const companiesPanelRows = useMemo(() => {
    if (companyMode === "attention") {
      const rows = filteredCompanies.filter((company) => attentionCompanyIds.has(company.id));
      return rows.length ? rows : filteredCompanies.slice(0, 16);
    }

    if (companyMode === "qa") {
      return filteredQaRows.map((item) => item.company);
    }

    if (companyMode === "launch") {
      return filteredLaunchPipelineRows.map((item) => item.company);
    }

    if (companyMode === "paid") {
      return filteredPaidOnboardingRows.map((item) => item.company);
    }

    if (companyMode === "billing") {
      return billingControlRows.map((item) => item.company);
    }

    if (companyMode === "autopilot") {
      return autopilotCompanies;
    }

    if (companyMode === "handoff") {
      return filteredCompanyHandoffRows.map((item) => item.company);
    }

    if (companyMode === "recent") {
      return recentCompanies;
    }

    return filteredCompanies;
  }, [attentionCompanyIds, autopilotCompanies, billingControlRows, companyMode, filteredCompanies, filteredCompanyHandoffRows, filteredLaunchPipelineRows, filteredPaidOnboardingRows, filteredQaRows, recentCompanies]);
  const companiesPanelCounts = {
    attention: attentionCompanies.length,
    qa: filteredQaRows.length,
    launch: filteredLaunchPipelineRows.length,
    paid: filteredPaidOnboardingRows.length,
    billing: billingControlRows.length,
    autopilot: autopilotCompanies.length,
    handoff: companyHandoffRows.length,
    recent: recentCompanies.length,
    all: filteredCompanies.length
  };
  const companyStatusSummary = [
    { key: "active", label: "Активные", count: activeCompanies },
    { key: "paused", label: "На паузе", count: pausedCompanies },
    { key: "archived", label: "Архив", count: archivedCompanies }
  ];
  const focusedCompany = useMemo(
    () => companiesPanelRows.find((company) => company.id === focusedCompanyId) || companiesPanelRows[0] || null,
    [companiesPanelRows, focusedCompanyId]
  );
  const focusedCompanySubscription = focusedCompany ? subscriptionsByCompanyId.get(focusedCompany.id) || null : null;
  const totalOpenLeadsInPlatform = companies.reduce((total, company) => total + Number(company.open_leads_count || 0), 0);
  const averageMembersPerCompany = totalCompanies ? Math.round(totalActiveMembers / totalCompanies) : 0;
  const averageClientsPerCompany = totalCompanies ? Math.round(totalClientsInPlatform / totalCompanies) : 0;
  const averageLeadsPerCompany = totalCompanies ? Math.round(totalLeadsInPlatform / totalCompanies) : 0;
  const usageOverview = [
    {
      label: "Средняя команда",
      value: `${averageMembersPerCompany}`,
      note: totalCompanies ? `На ${totalCompanies} компаниях в системе` : "Пока нет компаний"
    },
    {
      label: "Средняя база клиентов",
      value: `${averageClientsPerCompany}`,
      note: `${platformEurFormatter.format(totalClientsInPlatform)} клиентов на платформе`
    },
    {
      label: "Средний поток заявок",
      value: `${averageLeadsPerCompany}`,
      note: `${platformEurFormatter.format(totalLeadsInPlatform)} заявок суммарно`
    },
    {
      label: "Открытые заявки",
      value: `${platformEurFormatter.format(totalOpenLeadsInPlatform)}`,
      note:
        totalLeadsInPlatform > 0
          ? `${Math.round((totalOpenLeadsInPlatform / totalLeadsInPlatform) * 100)}% от всего потока сейчас в работе`
          : "Пока без активного потока"
    }
  ];
  const revenueByPlan = useMemo(() => {
    const totals = new Map();

    for (const company of filteredCompanies) {
      const subscription = subscriptionsByCompanyId.get(company.id) || null;
      const planCode = subscription?.plan_code || company.plan_code || "starter";
      const entry = totals.get(planCode) || { planCode, companies: 0, mrr: 0, atRisk: 0 };
      entry.companies += 1;

      if (subscription?.billing_status === "active" || subscription?.billing_status === "manual") {
        entry.mrr += Number(subscription?.price_monthly || 0);
      }

      if (subscription?.billing_status === "past_due" || subscription?.billing_status === "paused") {
        entry.atRisk += Number(subscription?.price_monthly || 0);
      }

      totals.set(planCode, entry);
    }

    return Array.from(totals.values()).sort((left, right) => right.mrr - left.mrr || right.companies - left.companies);
  }, [filteredCompanies, subscriptionsByCompanyId]);
  const seatPressureRows = useMemo(() => {
    return filteredCompanies
      .map((company) => {
        const subscription = subscriptionsByCompanyId.get(company.id) || null;
        const planCode = subscription?.plan_code || company.plan_code || "starter";
        const seatLimit = planSeatLimits[planCode];
        const activeMembersCount = Number(company.active_members_count || 0);

        if (seatLimit == null) {
          return null;
        }

        const seatsLeft = seatLimit - activeMembersCount;

        if (seatsLeft > 1) {
          return null;
        }

        return {
          company,
          planCode,
          seatLimit,
          activeMembersCount,
          seatsLeft
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.seatsLeft - right.seatsLeft || right.activeMembersCount - left.activeMembersCount)
      .slice(0, 8);
  }, [filteredCompanies, subscriptionsByCompanyId]);
  const invoiceQueue = useMemo(() => {
    const kindRank = {
      past_due: 5,
      paused: 4,
      trial: 3,
      renewal: 2
    };

    return filteredCompanies
      .map((company) => {
        const subscription = subscriptionsByCompanyId.get(company.id) || null;
        const linkedDemoRequest = latestDemoRequestByCompanyId.get(company.id) || null;
        const commercialContext = getOverviewCommercialContext(company, subscription, linkedDemoRequest);
        const commercialStage = getCommercialCloseStage(subscription, subscriptionEventsByCompanyId.get(company.id) || []);
        const amount = commercialContext.chargeAmount != null ? Number(commercialContext.chargeAmount) : Number(subscription?.price_monthly || 0);
        const renewDaysLeft = getDaysUntil(subscription?.renews_at);
        const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
        const requestFollowUpAt = getDemoRequestCreatorFollowUpAt(linkedDemoRequest);
        const requestFollowUpState = getDemoRequestFollowUpState(linkedDemoRequest);
        const creatorNote = getDemoRequestCreatorNote(linkedDemoRequest);

        if (subscription?.billing_status === "past_due") {
          const dueDate = commercialContext.paymentDueAt || subscription?.renews_at || subscription?.trial_ends_at || subscription?.ends_at || null;
          const daysLeft = getDaysUntil(dueDate);
          return {
            company,
            subscription,
            commercialContext,
            kind: "past_due",
            commercialStage,
            amount,
            dueDate,
            daysLeft,
            dueState: getInvoiceDueState(daysLeft),
            requestFollowUpAt,
            requestFollowUpState,
            creatorNote,
            note: "Просрочка по оплате, нужен контакт с владельцем."
          };
        }

        if (subscription?.billing_status === "paused") {
          const dueDate = commercialContext.paymentDueAt || subscription?.renews_at || null;
          const daysLeft = getDaysUntil(dueDate);
          return {
            company,
            subscription,
            commercialContext,
            kind: "paused",
            commercialStage,
            amount,
            dueDate,
            daysLeft,
            dueState: getInvoiceDueState(daysLeft),
            requestFollowUpAt,
            requestFollowUpState,
            creatorNote,
            note: "Подписка на паузе, проверьте возврат в активный биллинг."
          };
        }

        if (subscription?.billing_status === "trial" && trialDaysLeft != null && trialDaysLeft <= 7) {
          const dueDate = commercialContext.paymentDueAt || subscription?.trial_ends_at || null;
          const daysLeft = getDaysUntil(dueDate);
          return {
            company,
            subscription,
            commercialContext,
            kind: "trial",
            commercialStage,
            amount,
            dueDate,
            daysLeft,
            dueState: getInvoiceDueState(daysLeft),
            requestFollowUpAt,
            requestFollowUpState,
            creatorNote,
            note: trialDaysLeft < 0 ? "Триал уже закончился, нужно решение." : "Триал заканчивается, пора конвертировать."
          };
        }

        if ((subscription?.billing_status === "active" || subscription?.billing_status === "manual") && renewDaysLeft != null && renewDaysLeft <= 30) {
          const dueDate = commercialContext.paymentDueAt || subscription?.renews_at || null;
          const daysLeft = getDaysUntil(dueDate);
          return {
            company,
            subscription,
            commercialContext,
            kind: "renewal",
            commercialStage,
            amount,
            dueDate,
            daysLeft,
            dueState: getInvoiceDueState(daysLeft),
            requestFollowUpAt,
            requestFollowUpState,
            creatorNote,
            note: renewDaysLeft < 0 ? "Продление уже просрочено." : "Скоро следующее списание / инвойс."
          };
        }

        return null;
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftDays = left.daysLeft == null ? 9999 : left.daysLeft;
        const rightDays = right.daysLeft == null ? 9999 : right.daysLeft;
        return (
          (kindRank[right.kind] || 0) - (kindRank[left.kind] || 0) ||
          leftDays - rightDays
        );
      })
      .slice(0, 10);
  }, [filteredCompanies, latestDemoRequestByCompanyId, subscriptionEventsByCompanyId, subscriptionsByCompanyId]);
  const filteredInvoiceQueue = useMemo(() => {
    if (invoiceFilter === "all") {
      return invoiceQueue;
    }

    if (invoiceFilter === "overdue") {
      return invoiceQueue.filter((item) => item.dueState === "overdue");
    }

    if (invoiceFilter === "today") {
      return invoiceQueue.filter((item) => item.dueState === "today");
    }

    if (invoiceFilter === "invoice_sent") {
      return invoiceQueue.filter((item) => item.commercialStage === "invoice_sent");
    }

    if (invoiceFilter === "manual_prepared") {
      return invoiceQueue.filter((item) => item.commercialStage === "manual_prepared");
    }

    if (invoiceFilter === "follow_up") {
      return invoiceQueue.filter((item) => item.requestFollowUpState === "overdue" || item.requestFollowUpState === "today");
    }

    return invoiceQueue;
  }, [invoiceFilter, invoiceQueue]);
  const invoiceQueueSummary = useMemo(
    () => ({
      pastDue: invoiceQueue.filter((item) => item.kind === "past_due").length,
      paused: invoiceQueue.filter((item) => item.kind === "paused").length,
      trial: invoiceQueue.filter((item) => item.kind === "trial").length,
      renewal: invoiceQueue.filter((item) => item.kind === "renewal").length,
      invoiceSent: invoiceQueue.filter((item) => item.commercialStage === "invoice_sent").length,
      manualPrepared: invoiceQueue.filter((item) => item.commercialStage === "manual_prepared").length,
      overdue: invoiceQueue.filter((item) => item.dueState === "overdue").length,
      today: invoiceQueue.filter((item) => item.dueState === "today").length,
      followUp: invoiceQueue.filter((item) => item.requestFollowUpState === "overdue" || item.requestFollowUpState === "today").length
    }),
    [invoiceQueue]
  );
  const usageWatchlist = useMemo(() => {
    return filteredCompanies
      .map((company) => {
        const activeMembersCount = Math.max(1, Number(company.active_members_count || 0));
        const leadsCount = Number(company.leads_count || 0);
        const openLeadsCount = Number(company.open_leads_count || 0);
        const clientsCount = Number(company.clients_count || 0);

        return {
          company,
          leadsPerMember: Math.round((leadsCount / activeMembersCount) * 10) / 10,
          openLeadsCount,
          clientsCount,
          activeMembersCount
        };
      })
      .sort((left, right) => right.openLeadsCount - left.openLeadsCount || right.leadsPerMember - left.leadsPerMember)
      .slice(0, 6);
  }, [filteredCompanies]);

  useEffect(() => {
    if (!companiesPanelRows.length) {
      if (focusedCompanyId) {
        setFocusedCompanyId("");
      }
      return;
    }

    if (!focusedCompanyId || !companiesPanelRows.some((company) => company.id === focusedCompanyId)) {
      setFocusedCompanyId(companiesPanelRows[0].id);
    }
  }, [companiesPanelRows, focusedCompanyId]);
  useEffect(() => {
    if (companyMode !== "paid" || !filteredPaidCandidate?.company?.id) {
      return;
    }

    if (focusedCompanyId !== filteredPaidCandidate.company.id) {
      setFocusedCompanyId(filteredPaidCandidate.company.id);
    }
  }, [companyMode, filteredPaidCandidate, focusedCompanyId]);

  function openDemoRequestById(requestId, status = "all") {
    setActiveView("demo");
    if (status) {
      setDemoStatusFilter(status);
    }
    window.setTimeout(() => {
      const element = document.getElementById(`platform-demo-request-${requestId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Панель создателя</h1>
          <p>Отдельный слой над CRM компаний: активации, тарифы и контроль подключенных центров.</p>
        </div>
        <div className="page-header-actions">
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по компании, владельцу, телефону, почте"
          />
          <select
            className="search-input platform-filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="paused">На паузе</option>
            <option value="archived">Архив</option>
          </select>
          <select
            className="search-input platform-filter-select"
            value={companyAudienceFilter}
            onChange={(event) => setCompanyAudienceFilter(event.target.value)}
          >
            <option value="all">Все компании</option>
            <option value="real">Только реальные</option>
            <option value="demo">Только demo</option>
          </select>
        </div>
      </div>

      <div className="crm-summary-bar">
        <button type="button" className={`tab-button ${activeView === "overview" ? "active" : ""}`} onClick={() => setActiveView("overview")}>
          Обзор
        </button>
        <button type="button" className={`tab-button ${activeView === "companies" ? "active" : ""}`} onClick={() => setActiveView("companies")}>
          Компании
        </button>
        <button type="button" className={`tab-button ${activeView === "subscriptions" ? "active" : ""}`} onClick={() => setActiveView("subscriptions")}>
          Подписки
        </button>
        <button type="button" className={`tab-button ${activeView === "demo" ? "active" : ""}`} onClick={() => setActiveView("demo")}>
          Демо-заявки
        </button>
      </div>

      {activeView === "overview" ? (
        <>
          <div className="metrics-grid">
            <MetricCard icon="LV" label="Реальных компаний" value={totalRealCompanies} accent />
            <MetricCard icon="АК" label="Активных" value={activeCompanies} variant="success" />
            <MetricCard icon="PS" label="На паузе" value={pausedCompanies} variant="warning" />
            <MetricCard icon="ЛД" label="Лидов на запуск" value={realDemoRequests.length} variant="info" />
            <MetricCard icon="ЛЮ" label="Сотрудников" value={totalActiveMembers} />
            <MetricCard icon="CL" label="Клиентов на платформе" value={totalClientsInPlatform} />
            <MetricCard icon="MR" label="MRR" value={`${platformEurFormatter.format(monthlyRecurringRevenue)} EUR`} variant="success" />
          </div>

          <section className="surface-card platform-priority-surface">
            <div className="section-title">
              <div>
                <span className="eyebrow">Creator focus</span>
                <h2>Сначала смотри сюда</h2>
              </div>
            </div>

            <div className="platform-priority-grid">
              <article className="platform-priority-card priority-danger">
                <span>Нужны действия</span>
                <strong>{attentionCompanies.length}</strong>
                <p>Просрочки, лимиты, паузы и компании без полного контакта владельца.</p>
              </article>

              <article className="platform-priority-card priority-warning">
                <span>Скоро решения</span>
                <strong>{renewalRadar.length}</strong>
                <p>Ближайшие продления и триалы, которые скоро надо переводить или закрывать.</p>
              </article>

              <article className="platform-priority-card priority-success">
                <span>Здоровые активные</span>
                <strong>{Math.max(activeCompanies - attentionCompanies.filter((item) => item.company.status === "active").length, 0)}</strong>
                <p>Активные компании без явных сигналов, которые сейчас не требуют ручного вмешательства.</p>
              </article>
            </div>
          </section>

          <section className="surface-card platform-real-onboarding-surface">
            <div className="section-title">
              <div>
                <span className="eyebrow">Real onboarding</span>
                <h2>Первый реальный owner из витрины</h2>
              </div>
            </div>

            <div className="platform-demo-priority-grid">
              <article className="platform-demo-priority-card">
                <span>Реальные owner-лиды</span>
                <strong>{realDemoRequests.length}</strong>
                <p>Только живые входящие с витрины. QA-запросы больше не мешают paid onboarding очереди.</p>
              </article>
              <article className="platform-demo-priority-card">
                <span>Готовы к handoff</span>
                <strong>{demoActivationQueue.length}</strong>
                <p>Лиды, которые уже можно переводить в компанию, подписку и creator follow-up.</p>
              </article>
              <article className="platform-demo-priority-card">
                <span>Уже привязаны</span>
                <strong>{demoLinkedCompaniesCount}</strong>
                <p>Реальные owner-лиды, которые уже связаны с company activation path.</p>
              </article>
            </div>

            {firstRealOnboardingCandidate ? (() => {
              const realOnboardingCommercialContext = firstRealOnboardingLaunchRecord
                ? getOverviewCommercialContext(
                    firstRealOnboardingLaunchRecord.company,
                    firstRealOnboardingLaunchRecord.subscription,
                    firstRealOnboardingCandidate.request,
                    { nextStep: firstRealOnboardingLaunchRecord.nextStep }
                  )
                : null;

              return (
                <article className="platform-priority-hero readiness-almost_ready">
                <div className="platform-priority-hero-head">
                  <div>
                    <span className="eyebrow">Текущий live candidate</span>
                    <h3>{firstRealOnboardingCandidate.request.company_name || firstRealOnboardingCandidate.request.name}</h3>
                    <p>
                      {formatStorefrontPlanLabel(getDemoRequestCommerceSnapshot(firstRealOnboardingCandidate.request).plan)} ·{" "}
                      {firstRealOnboardingCandidate.billingPeriodLabel} ·{" "}
                      {businessTypeLabels[firstRealOnboardingCandidate.request.business_type] || "Автосервис"} ·{" "}
                      {sourceLabels[firstRealOnboardingCandidate.request.source] || formatLabel(firstRealOnboardingCandidate.request.source) || "Сайт"}
                    </p>
                  </div>
                  <div className="platform-priority-hero-chips">
                    <span className={`platform-status-chip demo-status-chip status-${firstRealOnboardingCandidate.request.status || "new"}`}>
                      {formatDemoRequestStatus(firstRealOnboardingCandidate.request.status)}
                    </span>
                    <span className={`platform-status-chip activation-stage-chip stage-${firstRealOnboardingCandidate.stage}`}>
                      {formatActivationStage(firstRealOnboardingCandidate.stage)}
                    </span>
                  </div>
                </div>

                <div className="platform-priority-hero-grid">
                  <div>
                    <span>Контакт</span>
                    <strong>{firstRealOnboardingCandidate.request.phone || "Не указан"}</strong>
                  </div>
                  <div>
                    <span>Email owner</span>
                    <strong>{firstRealOnboardingCandidate.activation.commerce.ownerEmail || "Не указан"}</strong>
                  </div>
                  <div>
                    <span>Следующий шаг</span>
                    <strong>{firstRealOnboardingCandidate.nextStep}</strong>
                  </div>
                  <div>
                    <span>Creator follow-up</span>
                    <strong>
                      {firstRealOnboardingCandidate.followUpAt
                        ? `${formatDemoRequestFollowUpState(firstRealOnboardingCandidate.followUpState)} · ${formatDateTime(firstRealOnboardingCandidate.followUpAt)}`
                        : "Не задан"}
                    </strong>
                  </div>
                  <div>
                    <span>Компания</span>
                    <strong>{firstRealOnboardingCandidate.linkedCompany?.name || "Ещё не создана"}</strong>
                  </div>
                  <div>
                    <span>Биллинг</span>
                    <strong>{firstRealOnboardingCandidate.linkedSubscription ? formatBillingStatus(firstRealOnboardingCandidate.linkedSubscription.billing_status) : "Подписки ещё нет"}</strong>
                  </div>
                  {realOnboardingCommercialContext ? (
                    <div>
                      <span>Сумма</span>
                      <strong>
                        {realOnboardingCommercialContext.chargeAmount
                          ? `${platformEurFormatter.format(realOnboardingCommercialContext.chargeAmount)} ${realOnboardingCommercialContext.chargeSuffix}`
                          : "Уточнить вручную"}
                      </strong>
                    </div>
                  ) : null}
                  {realOnboardingCommercialContext ? (
                    <div>
                      <span>Срок оплаты</span>
                      <strong>{realOnboardingCommercialContext.paymentDueAt ? formatDateTime(realOnboardingCommercialContext.paymentDueAt) : "Не задан"}</strong>
                    </div>
                  ) : null}
                  {firstRealOnboardingCandidate.linkedSubscription?.trial_ends_at ? (
                    <div>
                      <span>Free month / trial до</span>
                      <strong>{formatDateTime(firstRealOnboardingCandidate.linkedSubscription.trial_ends_at)}</strong>
                    </div>
                  ) : null}
                </div>

                {firstRealOnboardingCandidate.creatorNote ? (
                  <div className="platform-priority-hero-next">
                    <strong>Заметка creator</strong>
                    <span>{firstRealOnboardingCandidate.creatorNote}</span>
                  </div>
                ) : null}

                {firstRealOnboardingLaunchRecord ? (
                  <>
                    <div className="platform-priority-hero-next">
                      <strong>Что закрываем после handoff</strong>
                      <span>{firstRealOnboardingLaunchRecord.nextStep}</span>
                    </div>

                    <div className="platform-priority-hero-blockers">
                      {firstRealOnboardingLaunchRecord.blockers.slice(0, 4).map((blocker) => (
                        <div key={`${firstRealOnboardingLaunchRecord.company.id}-${blocker.key}`} className="platform-priority-hero-blocker">
                          <span>Шаг</span>
                          <strong>{blocker.label}</strong>
                        </div>
                      ))}
                    </div>

                    {firstRealOnboardingPrimaryAction ? (
                      <div className="platform-company-closer-note">
                        <strong>Рекомендуемый шаг:</strong>
                        <span>{firstRealOnboardingPrimaryAction.note}</span>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="platform-priority-hero-actions">
                  {firstRealOnboardingCandidate.stage === "unlinked" ? (
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={demoRequestSavingId === firstRealOnboardingCandidate.request.id}
                      onClick={() => createCompanyFromDemoRequest(firstRealOnboardingCandidate.request.id)}
                    >
                      {String(firstRealOnboardingCandidate.activation.commerce.billing || "").toLowerCase() === "free_month"
                        ? "Быстрый free month"
                        : "Создать компанию"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => openDemoRequestById(firstRealOnboardingCandidate.request.id, firstRealOnboardingCandidate.request.status || "all")}
                  >
                    Открыть handoff
                  </button>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={demoRequestSavingId === firstRealOnboardingCandidate.request.id || firstRealOnboardingCandidate.request.status === "contacted"}
                    onClick={() =>
                      updatePlatformDemoRequestStatus(firstRealOnboardingCandidate.request.id, {
                        status: "contacted",
                        connected_company_id: firstRealOnboardingCandidate.request.connected_company_id || null
                      })
                    }
                  >
                    Связались
                  </button>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={demoRequestSavingId === firstRealOnboardingCandidate.request.id || firstRealOnboardingCandidate.request.status === "qualified"}
                    onClick={() =>
                      updatePlatformDemoRequestStatus(firstRealOnboardingCandidate.request.id, {
                        status: "qualified",
                        connected_company_id: firstRealOnboardingCandidate.request.connected_company_id || null
                      })
                    }
                  >
                    Квалифицировать
                  </button>
                  {firstRealOnboardingCandidate.linkedCompany ? (
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => {
                        setActiveView("companies");
                        setCompanyMode("handoff");
                        setFocusedCompanyId(firstRealOnboardingCandidate.linkedCompany.id);
                      }}
                    >
                      Открыть компанию
                    </button>
                  ) : null}
                  {firstRealOnboardingCandidate.linkedCompany && !firstRealOnboardingCandidate.linkedSubscription ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={subscriptionSavingId === firstRealOnboardingCandidate.linkedCompany.id}
                      onClick={() =>
                        bootstrapOverviewSubscription(
                          firstRealOnboardingCandidate.linkedCompany,
                          firstRealOnboardingCandidate.linkedSubscription,
                          firstRealOnboardingCandidate.request
                        )
                      }
                    >
                      Подписка
                    </button>
                  ) : null}
                  {firstRealOnboardingLaunchRecord && firstRealOnboardingPrimaryAction ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={
                        subscriptionSavingId === firstRealOnboardingLaunchRecord.company.id ||
                        launchBundleSavingId === firstRealOnboardingLaunchRecord.company.id ||
                        starterAccessCreatingId === firstRealOnboardingLaunchRecord.company.id ||
                        companyPackApplyingId === firstRealOnboardingLaunchRecord.company.id
                      }
                      onClick={() =>
                        executePrimaryPaidAction(
                          firstRealOnboardingPrimaryAction.key,
                          firstRealOnboardingLaunchRecord,
                          firstRealOnboardingCandidate.request
                        )
                      }
                    >
                      {firstRealOnboardingPrimaryAction.label}
                    </button>
                  ) : null}
                  {firstRealOnboardingLaunchRecord ? (
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={subscriptionSavingId === firstRealOnboardingLaunchRecord.company.id}
                      onClick={() =>
                        applyOverviewPaidAction(
                          "prepare_manual",
                          firstRealOnboardingLaunchRecord.company,
                          firstRealOnboardingLaunchRecord.subscription,
                          firstRealOnboardingCandidate.request
                        )
                      }
                    >
                      Manual
                    </button>
                  ) : null}
                  {firstRealOnboardingLaunchRecord ? (
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={subscriptionSavingId === firstRealOnboardingLaunchRecord.company.id}
                      onClick={() =>
                        applyOverviewPaidAction(
                          "invoice_sent",
                          firstRealOnboardingLaunchRecord.company,
                          firstRealOnboardingLaunchRecord.subscription,
                          firstRealOnboardingCandidate.request
                        )
                      }
                    >
                      Sent
                    </button>
                  ) : null}
                  {firstRealOnboardingLaunchRecord ? (
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={subscriptionSavingId === firstRealOnboardingLaunchRecord.company.id}
                      onClick={() =>
                        applyOverviewPaidAction(
                          "confirm_paid",
                          firstRealOnboardingLaunchRecord.company,
                          firstRealOnboardingLaunchRecord.subscription,
                          firstRealOnboardingCandidate.request
                        )
                      }
                    >
                      Paid
                    </button>
                  ) : null}
                  {firstRealOnboardingLaunchRecord ? (
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() =>
                        copyOverviewBillingPack(
                          firstRealOnboardingLaunchRecord.company,
                          firstRealOnboardingLaunchRecord.subscription,
                          firstRealOnboardingCandidate.request,
                          firstRealOnboardingLaunchRecord.nextStep
                        )
                      }
                    >
                      Pack
                    </button>
                  ) : null}
                  {firstRealOnboardingLaunchRecord ? (
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() =>
                        copyOverviewOwnerBillingPack(
                          firstRealOnboardingLaunchRecord.company,
                          firstRealOnboardingLaunchRecord.subscription,
                          firstRealOnboardingCandidate.request,
                          firstRealOnboardingLaunchRecord.nextStep
                        )
                      }
                    >
                      Owner msg
                    </button>
                  ) : null}
                </div>
              </article>
              );
            })() : (
              <div className="platform-manual-lead-empty">
                <div className="platform-manual-lead-empty-copy">
                  <strong>Пока нет реальных owner-лидов из витрины.</strong>
                  <p>Можно не ждать сайт и сразу завести первого живого owner lead вручную для paid onboarding.</p>
                </div>
                <button type="button" className="button button-outline" onClick={() => setActiveView("demo")}>
                  Открыть demo-заявки
                </button>
              </div>
            )}

            <form className="platform-manual-lead-card" onSubmit={handleCreateManualLead}>
              <div className="platform-manual-lead-head">
                <div>
                  <span className="eyebrow">Manual owner lead</span>
                  <h3>Добавить реальный лид вручную</h3>
                </div>
                <p>Для первого платного онбординга, когда owner пришёл не через витрину, а из звонка, встречи или личного контакта.</p>
              </div>

              <div className="platform-manual-lead-grid">
                <label>
                  Компания
                  <input
                    type="text"
                    required
                    placeholder="Например, CleanLine Service"
                    value={manualLeadForm.company_name}
                    onChange={(event) => setManualLeadForm((current) => ({ ...current, company_name: event.target.value }))}
                  />
                </label>
                <label>
                  Контакт
                  <input
                    type="text"
                    required
                    placeholder="Имя owner"
                    value={manualLeadForm.name}
                    onChange={(event) => setManualLeadForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  Телефон
                  <input
                    type="text"
                    required
                    placeholder="069..."
                    value={manualLeadForm.phone}
                    onChange={(event) => setManualLeadForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
                <label>
                  Email owner
                  <input
                    type="email"
                    required
                    placeholder="owner@center.md"
                    value={manualLeadForm.owner_email}
                    onChange={(event) => setManualLeadForm((current) => ({ ...current, owner_email: event.target.value }))}
                  />
                </label>
                <label>
                  Ниша
                  <select
                    value={manualLeadForm.business_type}
                    onChange={(event) => setManualLeadForm((current) => ({ ...current, business_type: event.target.value }))}
                  >
                    <option value="detailing">Детейлинг</option>
                    <option value="car_wash">Автомойка</option>
                    <option value="tire_service">Шиномонтаж</option>
                    <option value="auto_service">Автосервис</option>
                  </select>
                </label>
                <label>
                  Пакет
                  <select
                    value={manualLeadForm.plan}
                    onChange={(event) => setManualLeadForm((current) => ({ ...current, plan: event.target.value }))}
                  >
                    <option value="basic">Basic</option>
                    <option value="solo">Solo</option>
                    <option value="professional">Professional</option>
                  </select>
                </label>
              </div>

              <div className="platform-manual-lead-actions">
                <span>Первый шаг ужат до минимума: после создания сразу собираем company + free month + owner login.</span>
                <button type="submit" className="button button-primary" disabled={manualLeadSaving}>
                  {manualLeadSaving ? "Создаём..." : "Добавить lead на быстрый запуск"}
                </button>
              </div>
            </form>
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Real onboarding queue</span>
                <h2>Очередь живых owner-лидов от витрины до первой оплаты</h2>
              </div>
              <div className="section-title-aux">
                <span>{filteredRealOnboardingRows.length} лидов в текущем real-срезе</span>
              </div>
            </div>

            <div className="platform-company-mode-bar platform-company-subfilters">
              <button type="button" className={`tab-button ${realOnboardingFilter === "all" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("all")}>
                Все
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "action" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("action")}>
                Нужен шаг
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "follow_up" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("follow_up")}>
                Follow-up
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "company" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("company")}>
                Без company
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "subscription" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("subscription")}>
                Подписка / тариф
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "launch" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("launch")}>
                Launch prep
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "commercial" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("commercial")}>
                Commercial close
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "ready" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("ready")}>
                Ready
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "manual" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("manual")}>
                Вручную
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "storefront" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("storefront")}>
                С витрины
              </button>
              <button type="button" className={`tab-button ${realOnboardingFilter === "free_month" ? "active" : ""}`} onClick={() => setRealOnboardingFilter("free_month")}>
                Free month
              </button>
            </div>

            <div className="platform-launch-summary-grid">
              <article className="platform-launch-summary-card">
                <span>Всего real</span>
                <strong>{realOnboardingSummary.total}</strong>
                <p>Реальные owner-лиды без QA-демо шума.</p>
              </article>
              <article className="platform-launch-summary-card launch-risk">
                <span>Follow-up сейчас</span>
                <strong>{realOnboardingSummary.followUp}</strong>
                <p>Нужен звонок или дожим сегодня, чтобы лид не выпадал из paid onboarding.</p>
              </article>
              <article className="platform-launch-summary-card launch-risk">
                <span>Без company</span>
                <strong>{realOnboardingSummary.noCompany}</strong>
                <p>Ещё не созданы рабочие компании под живой лид.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Подписка / тариф</span>
                <strong>{realOnboardingSummary.needsSubscription}</strong>
                <p>Лид уже связан с company, но коммерческий контур ещё не собран.</p>
              </article>
              <article className="platform-launch-summary-card launch-almost">
                <span>Launch prep</span>
                <strong>{realOnboardingSummary.launchPrep}</strong>
                <p>Нужно закрыть active, team, services или handoff перед оплатой.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Commercial close</span>
                <strong>{realOnboardingSummary.commercial}</strong>
                <p>Ручной billing, invoice follow-up и подтверждение первой оплаты.</p>
              </article>
              <article className="platform-launch-summary-card launch-ready">
                <span>Ready</span>
                <strong>{realOnboardingSummary.ready}</strong>
                <p>Контур закрыт и компанию уже можно переводить в платный рабочий сценарий.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Вручную</span>
                <strong>{realOnboardingSummary.manual}</strong>
                <p>Owner-лиды, которые creator завёл сам без ожидания сайта.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Free month</span>
                <strong>{realOnboardingSummary.freeMonth}</strong>
                <p>Быстрые подключения, идущие по сценарию бесплатного месяца.</p>
              </article>
            </div>

            {realOnboardingQueueRows.length ? (
              <div className="platform-close-queue-grid">
                {realOnboardingQueueRows.map((item) => {
                  const primaryPaidAction = item.company ? getPrimaryPaidActionConfig(item) : null;

                  return (
                    <article key={`${item.request.id}-real-onboarding`} className="platform-close-queue-card queue-fresh">
                      <div className="platform-close-queue-head">
                        <div>
                          <span>{item.queueLabel}</span>
                          <strong>{item.request.company_name || item.request.name || item.company?.name || "Новый лид"}</strong>
                        </div>
                        <p>{item.nextStep}</p>
                      </div>

                      <div className="platform-close-queue-list">
                        <div className="platform-close-queue-row">
                          <div>
                            <strong>Контакт</strong>
                            <span>{item.request.phone || item.company?.owner_email || item.company?.contact_email || "Не указан"}</span>
                          </div>
                        </div>
                        <div className="platform-close-queue-row">
                          <div>
                            <strong>Email owner</strong>
                            <span>{item.activation.commerce.ownerEmail || item.company?.owner_email || item.company?.contact_email || "Не указан"}</span>
                          </div>
                        </div>
                        <div className="platform-close-queue-row">
                          <div>
                            <strong>Источник</strong>
                            <span>{sourceLabels[item.request.source] || formatLabel(item.request.source) || "Сайт"}</span>
                          </div>
                        </div>
                        <div className="platform-close-queue-row">
                          <div>
                            <strong>Handoff</strong>
                            <span>{formatActivationStage(item.activation.stage)}</span>
                          </div>
                        </div>
                        <div className="platform-close-queue-row">
                          <div>
                            <strong>Follow-up</strong>
                            <span>
                              {item.followUpAt
                                ? `${formatDemoRequestFollowUpState(item.followUpState)} · ${formatDateTime(item.followUpAt)}`
                                : "Не задан"}
                            </span>
                          </div>
                        </div>
                        <div className="platform-close-queue-row">
                          <div>
                            <strong>Компания</strong>
                            <span>{item.company?.name || "Ещё не создана"}</span>
                          </div>
                        </div>
                        <div className="platform-close-queue-row">
                          <div>
                            <strong>Billing</strong>
                            <span>{item.subscription ? formatBillingStatus(item.subscription.billing_status) : "Подписки ещё нет"}</span>
                          </div>
                        </div>
                        <div className="platform-close-queue-row">
                          <div>
                            <strong>Пакет / запуск</strong>
                            <span>{formatStorefrontPlanLabel(item.activation.commerce.plan)} · {item.activation.billingPeriodLabel}</span>
                          </div>
                        </div>
                        {item.company ? (
                          <div className="platform-close-queue-row">
                            <div>
                              <strong>Commercial stage</strong>
                              <span>{formatCommercialCloseStage(item.commercialStage)}</span>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {item.blockers?.length ? (
                        <div className="platform-company-list-signals">
                          {item.blockers.slice(0, 4).map((blocker) => (
                            <span key={`${item.request.id}-${blocker.key}`}>{blocker.label}</span>
                          ))}
                        </div>
                      ) : null}

                      {item.creatorNote ? (
                        <div className="platform-company-closer-note">
                          <strong>Заметка creator:</strong>
                          <span>{item.creatorNote}</span>
                        </div>
                      ) : null}

                      <div className="platform-launch-actions">
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={demoRequestSavingId === item.request.id || item.request.status === "contacted"}
                          onClick={() =>
                            updatePlatformDemoRequestStatus(item.request.id, {
                              status: "contacted",
                              connected_company_id: item.request.connected_company_id || null
                            })
                          }
                        >
                          Связались
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={demoRequestSavingId === item.request.id || item.request.status === "qualified"}
                          onClick={() =>
                            updatePlatformDemoRequestStatus(item.request.id, {
                              status: "qualified",
                              connected_company_id: item.request.connected_company_id || null
                            })
                          }
                        >
                          Квалифицировать
                        </button>
                        {item.queueKey === "company" ? (
                          <button
                            type="button"
                            className="button button-primary"
                            disabled={demoRequestSavingId === item.request.id}
                            onClick={() => createCompanyFromDemoRequest(item.request.id)}
                            >
                              {String(item.activation.commerce.billing || "").toLowerCase() === "free_month"
                                ? "Быстрый free month"
                                : "Создать компанию"}
                          </button>
                        ) : null}
                        {item.queueKey === "subscription" && item.company ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={subscriptionSavingId === item.company.id}
                            onClick={() => bootstrapOverviewSubscription(item.company, item.subscription, item.request)}
                          >
                            Подписка
                          </button>
                        ) : null}
                        {item.queueKey === "activation" && item.company ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={subscriptionSavingId === item.company.id}
                            onClick={() => applyOverviewStatusAction("active", item.company, item.subscription, item.request)}
                          >
                            Active
                          </button>
                        ) : null}
                        {item.company && primaryPaidAction && item.requiresAction ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={
                              subscriptionSavingId === item.company.id ||
                              launchBundleSavingId === item.company.id ||
                              starterAccessCreatingId === item.company.id ||
                              companyPackApplyingId === item.company.id
                            }
                            onClick={() => executePrimaryPaidAction(primaryPaidAction.key, item, item.request)}
                          >
                            {primaryPaidAction.label}
                          </button>
                        ) : null}
                        {item.company ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={subscriptionSavingId === item.company.id}
                            onClick={() => applyOverviewPaidAction("prepare_manual", item.company, item.subscription, item.request)}
                          >
                            Manual
                          </button>
                        ) : null}
                        {item.company ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={subscriptionSavingId === item.company.id}
                            onClick={() => applyOverviewPaidAction("invoice_sent", item.company, item.subscription, item.request)}
                          >
                            Sent
                          </button>
                        ) : null}
                        {item.company ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={subscriptionSavingId === item.company.id}
                            onClick={() => applyOverviewPaidAction("confirm_paid", item.company, item.subscription, item.request)}
                          >
                            Paid
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => openDemoRequestById(item.request.id, item.request.status || "all")}
                        >
                          Handoff
                        </button>
                        {item.company ? (
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={() => {
                              setActiveView("companies");
                              setCompanyMode(item.requiresAction ? "paid" : "launch");
                              setFocusedCompanyId(item.company.id);
                            }}
                          >
                            Компания
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">В real onboarding сейчас нет лидов под выбранный фильтр.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Control map</span>
                <h2>Что уже на автопилоте, а что ещё на тебе</h2>
              </div>
            </div>

            <div className="platform-control-grid">
              <article className="platform-control-card control-autopilot">
                <span>Автопилот</span>
                <strong>{creatorControlSummary.autopilot}</strong>
                <p>Активные компании без явных сигналов, где creator-слой сейчас не просит ручного шага.</p>
                <button type="button" className="button button-outline" onClick={() => {
                  setActiveView("companies");
                  setCompanyMode("autopilot");
                }}>
                  Открыть спокойные
                </button>
              </article>

              <article className="platform-control-card control-billing">
                <span>Billing control</span>
                <strong>{creatorControlSummary.billing}</strong>
                <p>Просрочки, trial, renewal и паузы, где решение по деньгам или статусу нельзя откладывать.</p>
                <button type="button" className="button button-outline" onClick={() => {
                  setActiveView("companies");
                  setCompanyMode("billing");
                }}>
                  Открыть billing
                </button>
              </article>

              <article className="platform-control-card control-onboarding">
                <span>Onboarding</span>
                <strong>{creatorControlSummary.onboarding}</strong>
                <p>Компании, где витрина уже сработала, но handoff и paid-launch ещё не дожаты до конца.</p>
                <button type="button" className="button button-outline" onClick={() => {
                  setActiveView("companies");
                  setCompanyMode("handoff");
                }}>
                  Открыть handoff
                </button>
              </article>

              <article className="platform-control-card control-ready">
                <span>Ready to bill</span>
                <strong>{creatorControlSummary.ready}</strong>
                <p>Компании, где осталось дожать финальный шаг и можно уверенно переводить в реальные оплаты.</p>
                <button type="button" className="button button-outline" onClick={() => {
                  setActiveView("companies");
                  setCompanyMode("launch");
                }}>
                  Открыть ready
                </button>
              </article>

              <article className="platform-control-card control-qa">
                <span>QA / hardening</span>
                <strong>{creatorControlSummary.qa}</strong>
                <p>Срез по проблемным компаниям, где не просто billing, а есть реальный structural risk в multi-company слое.</p>
                <button type="button" className="button button-outline" onClick={() => {
                  setActiveView("companies");
                  setCompanyMode("qa");
                }}>
                  Открыть QA
                </button>
              </article>
            </div>
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Коммерческий обзор</span>
                <h2>Что происходит с выручкой и подключениями</h2>
              </div>
            </div>

            <div className="platform-commerce-grid">
              <article className="platform-commerce-card platform-commerce-card-accent">
                <span>MRR платформы</span>
                <strong>{platformEurFormatter.format(monthlyRecurringRevenue)} EUR</strong>
                <p>{paidCompaniesCount} платящих компаний уже заведены в рабочий контур.</p>
              </article>

              <article className="platform-commerce-card">
                <span>Под риском</span>
                <strong>{platformEurFormatter.format(monthlyRevenueAtRisk)} EUR</strong>
                <p>Здесь только деньги, которые реально требуют ручного решения creator.</p>
              </article>

              <article className="platform-commerce-card">
                <span>Скоро решение</span>
                <strong>{trialEndingSoonCompanies + expiredTrialCompanies}</strong>
                <p>Триалы и продления, которые скоро нужно либо подтвердить, либо закрыть.</p>
              </article>
            </div>
          </section>

          {false ? (
            <>
          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Коммерческий обзор</span>
                <h2>Что происходит с выручкой и подключениями</h2>
              </div>
            </div>

            <div className="platform-commerce-grid">
              <article className="platform-commerce-card platform-commerce-card-accent">
                <span>MRR платформы</span>
                <strong>{platformEurFormatter.format(monthlyRecurringRevenue)} EUR</strong>
                <p>
                  {paidCompaniesCount} платящих компаний: {activeSubscriptions} активных и {manualSubscriptions} в ручном режиме.
                </p>
              </article>

              <article className="platform-commerce-card">
                <span>Средний чек</span>
                <strong>{platformEurFormatter.format(averageRevenuePerPaidCompany)} EUR</strong>
                <p>Текущий средний ежемесячный доход на одну платящую компанию.</p>
              </article>

              <article className="platform-commerce-card">
                <span>Выручка под риском</span>
                <strong>{platformEurFormatter.format(monthlyRevenueAtRisk)} EUR</strong>
                <p>{pastDueSubscriptions} просроченных и {pausedSubscriptions} paused-подписок требуют внимания.</p>
              </article>

              <article className="platform-commerce-card">
                <span>Триалы и конверсия</span>
                <strong>{trialEndingSoonCompanies + expiredTrialCompanies}</strong>
                <p>{trialEndingSoonCompanies} триалов заканчиваются скоро, {expiredTrialCompanies} уже требуют решения.</p>
              </article>
            </div>

            <div className="platform-signals-grid">
              {commercialSignals.map((signal) => (
                <article key={signal.title} className="platform-signal-card">
                  <span>{signal.title}</span>
                  <strong>{signal.value}</strong>
                  <p>{signal.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Операционный обзор</span>
                <h2>Что происходит по платформе</h2>
              </div>
            </div>

            <div className="platform-overview-grid">
              <article className="platform-overview-card">
                <strong>По подпискам</strong>
                <div className="platform-overview-list">
                  <div><span>Активных</span><b>{activeSubscriptions}</b></div>
                  <div><span>Триал</span><b>{trialCompanies}</b></div>
                  <div><span>На паузе</span><b>{pausedSubscriptions}</b></div>
                </div>
              </article>

              <article className="platform-overview-card">
                <strong>По тарифам</strong>
                <div className="platform-overview-list">
                  {planSummary.map((item) => (
                    <div key={item.planCode}>
                      <span>{planLabels[item.planCode] || item.planCode}</span>
                      <b>{item.count}</b>
                    </div>
                  ))}
                </div>
              </article>

              <article className="platform-overview-card">
                <strong>По нишам</strong>
                <div className="platform-overview-list">
                  {businessTypeSummary.map((item) => (
                    <div key={item.businessType}>
                      <span>{businessTypeLabels[item.businessType] || item.businessType}</span>
                      <b>{item.count}</b>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Manual queue</span>
                <h2>Единая очередь создателя</h2>
              </div>
              <div className="section-title-aux">
                <span>{creatorDailyQueue.length} компаний в ручной очереди</span>
              </div>
            </div>

            {creatorDailyQueue.length ? (
              <div className="platform-control-queue">
                {creatorDailyQueue.map(({ company, subscription, control }) => (
                  <article key={`${company.id}-control`} className={`platform-control-queue-card bucket-${control.bucket}`}>
                    <div className="platform-control-queue-head">
                      <div>
                        <strong>{company.name}</strong>
                        <span>
                          {businessTypeLabels[company.business_type] || "Автосервис"} ·{" "}
                          {planLabels[subscription?.plan_code || company.plan_code || "starter"] || "Старт"}
                        </span>
                      </div>
                      <div className="platform-control-queue-chips">
                        <span className={`platform-status-chip status-${company.status}`}>{formatCompanyStatus(company.status)}</span>
                        <span className={`platform-status-chip control-${control.bucket}`}>{control.title}</span>
                      </div>
                    </div>
                    <div className="platform-control-queue-meta">
                      <span>{control.dueLabel}</span>
                      <span>{company.owner_email || company.contact_email || "Контакт не указан"}</span>
                    </div>
                    <strong className="platform-control-queue-next">{control.nextStep}</strong>
                    <div className="platform-control-queue-list">
                      {control.actionItems.map((item) => (
                        <div key={`${company.id}-${item}`} className="platform-control-queue-item">
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="platform-control-queue-foot">
                      <button type="button" className="button button-outline" onClick={() => {
                        setActiveView("companies");
                        setFocusedCompanyId(company.id);
                      }}>
                        Открыть компанию
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Ручная очередь пустая: creator-слой сейчас не требует срочных действий.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Billing control</span>
                <h2>На что смотреть создателю прямо сейчас</h2>
              </div>
            </div>

            <div className="platform-billing-snapshot-grid">
              {billingSnapshot.map((item) => (
                <article key={item.label} className="platform-billing-snapshot-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Usage overview</span>
                <h2>Как платформа реально используется</h2>
              </div>
            </div>

            <div className="platform-usage-grid">
              {usageOverview.map((item) => (
                <article key={item.label} className="platform-usage-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>

            <div className="platform-subscription-matrix">
              {usageWatchlist.map((item) => (
                <article key={`${item.company.id}-usage`} className="platform-subscription-row">
                  <div className="platform-subscription-row-main">
                    <strong>{item.company.name}</strong>
                    <span>
                      {businessTypeLabels[item.company.business_type] || "Автосервис"} · {item.activeMembersCount} сотрудников
                    </span>
                  </div>
                  <div className="platform-subscription-row-meta">
                    <span>{item.clientsCount} клиентов</span>
                    <span>{item.openLeadsCount} открытых заявок</span>
                    <span>{item.leadsPerMember} заявок на сотрудника</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Seat control</span>
                <h2>Где упираемся в лимиты тарифа</h2>
              </div>
              <div className="section-title-aux">
                <span>{seatPressureRows.length} компаний возле лимита</span>
              </div>
            </div>

            {seatPressureRows.length ? (
              <div className="platform-seat-list">
                {seatPressureRows.map((item) => (
                  <article key={`${item.company.id}-seats`} className="platform-seat-card">
                    <div>
                      <strong>{item.company.name}</strong>
                      <span>{planLabels[item.planCode] || item.planCode}</span>
                    </div>
                    <div className="platform-seat-meta">
                      <b>{item.activeMembersCount}/{item.seatLimit}</b>
                      <span>
                        {item.seatsLeft < 0
                          ? `Превышение на ${Math.abs(item.seatsLeft)}`
                          : item.seatsLeft === 0
                          ? "Лимит достигнут"
                          : `Осталось ${item.seatsLeft} место`}
                      </span>
                    </div>
                    <button type="button" className="button button-outline" onClick={() => {
                      setActiveView("companies");
                      setFocusedCompanyId(item.company.id);
                    }}>
                      Открыть компанию
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Сейчас ни одна компания не упирается в seat limit.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Invoice queue</span>
                <h2>Что нужно собрать, продлить или дожать</h2>
              </div>
              <div className="section-title-aux">
                <span>{filteredInvoiceQueue.length} компаний в текущем срезе</span>
              </div>
            </div>

            <div className="platform-company-mode-bar platform-company-subfilters">
              <button type="button" className={`tab-button ${invoiceFilter === "all" ? "active" : ""}`} onClick={() => setInvoiceFilter("all")}>
                Все
              </button>
              <button type="button" className={`tab-button ${invoiceFilter === "overdue" ? "active" : ""}`} onClick={() => setInvoiceFilter("overdue")}>
                Просрочено
              </button>
              <button type="button" className={`tab-button ${invoiceFilter === "today" ? "active" : ""}`} onClick={() => setInvoiceFilter("today")}>
                Сегодня
              </button>
              <button type="button" className={`tab-button ${invoiceFilter === "invoice_sent" ? "active" : ""}`} onClick={() => setInvoiceFilter("invoice_sent")}>
                Invoice sent
              </button>
              <button type="button" className={`tab-button ${invoiceFilter === "manual_prepared" ? "active" : ""}`} onClick={() => setInvoiceFilter("manual_prepared")}>
                Manual prepared
              </button>
              <button type="button" className={`tab-button ${invoiceFilter === "follow_up" ? "active" : ""}`} onClick={() => setInvoiceFilter("follow_up")}>
                Follow-up
              </button>
            </div>

            <div className="crm-summary-bar platform-company-summary-bar">
              <span>{invoiceQueueSummary.overdue} просрочено</span>
              <span>{invoiceQueueSummary.today} сегодня</span>
              <span>{invoiceQueueSummary.pastDue} просрочка</span>
              <span>{invoiceQueueSummary.paused} на паузе</span>
              <span>{invoiceQueueSummary.trial} trial close</span>
              <span>{invoiceQueueSummary.renewal} renewal</span>
              <span>{invoiceQueueSummary.manualPrepared} manual prepared</span>
              <span>{invoiceQueueSummary.invoiceSent} invoice sent</span>
              <span>{invoiceQueueSummary.followUp} follow-up</span>
            </div>

            {filteredInvoiceQueue.length ? (
              <div className="platform-invoice-list">
                {filteredInvoiceQueue.map((item) => (
                  <article key={`${item.company.id}-${item.kind}`} className="platform-invoice-card">
                    <div className="platform-invoice-head">
                      <div>
                        <strong>{item.company.name}</strong>
                        <span>
                          {item.kind === "past_due"
                            ? "Просрочка"
                            : item.kind === "paused"
                            ? "Пауза"
                            : item.kind === "trial"
                            ? "Триал"
                            : "Продление"}
                        </span>
                      </div>
                      <b>{item.amount ? `${platformEurFormatter.format(item.amount)} ${item.commercialContext?.chargeSuffix || "EUR"}` : "Ручной расчёт"}</b>
                    </div>
                    <div className="platform-invoice-stage-row">
                      <span className={`platform-commercial-stage tone-${getCommercialCloseStageTone(item.commercialStage)}`}>
                        {formatCommercialCloseStage(item.commercialStage)}
                      </span>
                      <span>{item.commercialContext?.ownerEmail || item.company.owner_email || item.company.contact_email || "Без контакта"}</span>
                    </div>
                    <div className="platform-invoice-meta">
                      <span>{item.dueDate ? formatDate(item.dueDate) : "Дата не задана"}</span>
                      <span>
                        {item.daysLeft == null
                          ? "Без дедлайна"
                          : item.daysLeft < 0
                          ? `Просрочено на ${Math.abs(item.daysLeft)} дн.`
                          : item.daysLeft === 0
                          ? "Сегодня"
                          : `Через ${item.daysLeft} дн.`}
                      </span>
                      <span>{formatManualBillingChannel(item.commercialContext?.paymentChannel)}</span>
                    </div>
                    <div className="platform-invoice-meta">
                      <span>
                        Follow-up: {item.requestFollowUpAt ? `${formatDemoRequestFollowUpState(item.requestFollowUpState)} · ${formatDateTime(item.requestFollowUpAt)}` : "Не задан"}
                      </span>
                      <span>{item.creatorNote || "Без заметки creator"}</span>
                    </div>
                    <p>{item.commercialContext?.paymentDueAt ? `${item.note} Срок: ${formatDateTime(item.commercialContext.paymentDueAt)}.` : item.note}</p>
                    <div className="platform-launch-actions">
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={subscriptionSavingId === item.company.id}
                        onClick={() =>
                          applyOverviewPaidAction(
                            "prepare_manual",
                            item.company,
                            item.subscription,
                            latestDemoRequestByCompanyId.get(item.company.id) || null
                          )
                        }
                      >
                        Manual
                      </button>
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={subscriptionSavingId === item.company.id}
                        onClick={() =>
                          applyOverviewPaidAction(
                            "invoice_sent",
                            item.company,
                            item.subscription,
                            latestDemoRequestByCompanyId.get(item.company.id) || null
                          )
                        }
                      >
                        Sent
                      </button>
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={subscriptionSavingId === item.company.id}
                        onClick={() =>
                          applyOverviewPaidAction(
                            "confirm_paid",
                            item.company,
                            item.subscription,
                            latestDemoRequestByCompanyId.get(item.company.id) || null
                          )
                        }
                      >
                        Paid
                      </button>
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={subscriptionSavingId === item.company.id}
                        onClick={() =>
                          applyOverviewPaidAction(
                            "pause_after_no_payment",
                            item.company,
                            item.subscription,
                            latestDemoRequestByCompanyId.get(item.company.id) || null
                          )
                        }
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() =>
                          copyOverviewBillingPack(
                            item.company,
                            item.subscription,
                            latestDemoRequestByCompanyId.get(item.company.id) || null,
                            item.note
                          )
                        }
                      >
                        Pack
                      </button>
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() =>
                          copyOverviewOwnerBillingPack(
                            item.company,
                            item.subscription,
                            latestDemoRequestByCompanyId.get(item.company.id) || null,
                            item.note
                          )
                        }
                      >
                        Owner msg
                      </button>
                      {latestDemoRequestByCompanyId.get(item.company.id) ? (
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => openDemoRequestById(latestDemoRequestByCompanyId.get(item.company.id).id, latestDemoRequestByCompanyId.get(item.company.id).status || "all")}
                        >
                          Handoff
                        </button>
                      ) : null}
                      {latestDemoRequestByCompanyId.get(item.company.id) ? (
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={demoRequestSavingId === latestDemoRequestByCompanyId.get(item.company.id).id || latestDemoRequestByCompanyId.get(item.company.id).status === "contacted"}
                          onClick={() =>
                            updatePlatformDemoRequestStatus(latestDemoRequestByCompanyId.get(item.company.id).id, {
                              status: "contacted",
                              connected_company_id: latestDemoRequestByCompanyId.get(item.company.id).connected_company_id || null
                            })
                          }
                        >
                          Связались
                        </button>
                      ) : null}
                      {latestDemoRequestByCompanyId.get(item.company.id) ? (
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={demoRequestSavingId === latestDemoRequestByCompanyId.get(item.company.id).id || latestDemoRequestByCompanyId.get(item.company.id).status === "qualified"}
                          onClick={() =>
                            updatePlatformDemoRequestStatus(latestDemoRequestByCompanyId.get(item.company.id).id, {
                              status: "qualified",
                              connected_company_id: latestDemoRequestByCompanyId.get(item.company.id).connected_company_id || null
                            })
                          }
                        >
                          Квалифицировать
                        </button>
                      ) : null}
                      {latestDemoRequestByCompanyId.get(item.company.id) ? (
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={demoRequestSavingId === latestDemoRequestByCompanyId.get(item.company.id).id}
                          onClick={() =>
                            updatePlatformDemoRequestStatus(latestDemoRequestByCompanyId.get(item.company.id).id, {
                              status: latestDemoRequestByCompanyId.get(item.company.id).status || "new",
                              connected_company_id: latestDemoRequestByCompanyId.get(item.company.id).connected_company_id || null,
                              meta_patch: {
                                creator_follow_up_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                                creator_note: item.creatorNote || "Повторно проверить оплату и ответ owner."
                              }
                            })
                          }
                        >
                          +1 день
                        </button>
                      ) : null}
                      {latestDemoRequestByCompanyId.get(item.company.id) ? (
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={demoRequestSavingId === latestDemoRequestByCompanyId.get(item.company.id).id}
                          onClick={() =>
                            updatePlatformDemoRequestStatus(latestDemoRequestByCompanyId.get(item.company.id).id, {
                              status: latestDemoRequestByCompanyId.get(item.company.id).status || "new",
                              connected_company_id: latestDemoRequestByCompanyId.get(item.company.id).connected_company_id || null,
                              meta_patch: {
                                creator_follow_up_at: new Date().toISOString(),
                                creator_note: item.creatorNote || "Срочно связаться по оплате сегодня."
                              }
                            })
                          }
                        >
                          Follow-up сегодня
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => {
                          setActiveView("companies");
                          setCompanyMode("paid");
                          setFocusedCompanyId(item.company.id);
                        }}
                      >
                        Paid close
                      </button>
                      <button type="button" className="button button-outline" onClick={() => {
                        setActiveView("companies");
                        setFocusedCompanyId(item.company.id);
                      }}>
                        Открыть компанию
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Сейчас по инвойсам и продлениям нет срочной очереди.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Очередь действий</span>
                <h2>Какие компании требуют следующего шага</h2>
              </div>
              <div className="section-title-aux">
                <span>{operationalQueue.length} в приоритете</span>
              </div>
            </div>

            {operationalQueue.length ? (
              <div className="platform-action-grid">
                {operationalQueue.map(({ company, subscription, items }) => (
                  <article key={company.id} className="platform-action-card">
                    <div className="platform-action-head">
                      <div>
                        <strong>{company.name}</strong>
                        <span>
                          {businessTypeLabels[company.business_type] || "Автосервис"} ·{" "}
                          {planLabels[subscription?.plan_code || company.plan_code || "starter"] || "Старт"}
                        </span>
                      </div>
                      <span className={`platform-status-chip status-${company.status}`}>{formatCompanyStatus(company.status)}</span>
                    </div>
                    <div className="platform-action-list">
                      {items.map((item) => (
                        <div key={item} className="platform-action-item">{item}</div>
                      ))}
                    </div>
                    <div className="platform-action-foot">
                      <span>{company.owner_email || company.contact_email || "Контакт не указан"}</span>
                      <button type="button" className="button button-outline" onClick={() => {
                        setActiveView("companies");
                        setFocusedCompanyId(company.id);
                      }}>
                        Открыть компанию
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Сейчас нет компаний, которым нужен немедленный следующий шаг.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Hard QA pass</span>
                <h2>Где multi-company слой ещё не идеален</h2>
              </div>
              <div className="section-title-aux">
                <span>{qaPriorityRows.length} компаний с QA-сигналами</span>
              </div>
            </div>

            <div className="platform-qa-summary-grid">
              <article className="platform-qa-summary-card qa-critical">
                <span>Критично</span>
                <strong>{qaSummary.critical}</strong>
                <p>Компании, где есть дырка по активации, подписке, owner-access или операционному контуру.</p>
              </article>
              <article className="platform-qa-summary-card qa-warning">
                <span>Нужна проверка</span>
                <strong>{qaSummary.warning}</strong>
                <p>Есть сигналы, но без немедленной поломки: сервисы, handoff, trial, seat pressure.</p>
              </article>
              <article className="platform-qa-summary-card qa-success">
                <span>Чисто</span>
                <strong>{qaSummary.ok}</strong>
                <p>Компании без явных QA-сигналов в текущем creator-срезе.</p>
              </article>
              <article className="platform-qa-summary-card">
                <span>Открытые handoff</span>
                <strong>{qaSummary.handoffOpen}</strong>
                <p>Сколько компаний ещё не закрыли путь от витрины до полного подключения.</p>
              </article>
            </div>

            {qaPriorityRows.length ? (
              <div className="platform-qa-grid">
                {qaPriorityRows.map(({ company, subscription, activation, issues, severity }) => (
                  <article key={`${company.id}-qa`} className={`platform-qa-card severity-${severity}`}>
                    <div className="platform-qa-head">
                      <div>
                        <strong>{company.name}</strong>
                        <span>
                          {businessTypeLabels[company.business_type] || "Автосервис"} · {planLabels[subscription?.plan_code || company.plan_code || "starter"] || "Старт"}
                        </span>
                      </div>
                      <div className="platform-qa-head-chips">
                        <span className={`platform-status-chip status-${company.status}`}>{formatCompanyStatus(company.status)}</span>
                        {activation ? (
                          <span className={`platform-status-chip activation-stage-chip stage-${activation.stage}`}>
                            {formatActivationStage(activation.stage)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="platform-qa-list">
                      {issues.slice(0, 4).map((issue) => (
                        <div key={issue} className="platform-qa-row">
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                    <div className="platform-qa-foot">
                      <span>{company.owner_email || company.contact_email || "Без контакта"}</span>
                      <button type="button" className="button button-outline" onClick={() => {
                        setActiveView("companies");
                        setCompanyMode("qa");
                        setFocusedCompanyId(company.id);
                      }}>
                        Открыть компанию
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Сейчас в creator-срезе нет явных multi-company QA сигналов.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">First real paid launch</span>
                <h2>Первый живой клиент на оплату и запуск</h2>
              </div>
              <div className="section-title-aux">
                <span>{firstRealPaidLaunchCandidate ? "1 живой кандидат" : "Живой кандидат появится после следующего real-шага"}</span>
              </div>
            </div>

            <div className="platform-launch-summary-grid">
              <article className="platform-launch-summary-card">
                <span>Реальных компаний</span>
                <strong>{totalRealCompanies}</strong>
                <p>Живые компании без demo-контура в текущем creator-срезе.</p>
              </article>
              <article className="platform-launch-summary-card launch-almost">
                <span>Ждут paid close</span>
                <strong>{realPaidOnboardingSummary.waiting}</strong>
                <p>Реальные компании, которые ещё не закрыты в первую оплату.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Реальные лиды</span>
                <strong>{demoRequestSummary.realCount}</strong>
                <p>Витринные owner/demo-request лиды без QA-мусора.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Demo bench</span>
                <strong>{demoPaidOnboardingRows.filter((item) => !item.paidReady).length}</strong>
                <p>Тестовые компании остаются отдельной скамейкой и не считаются живым paid close.</p>
              </article>
            </div>

            {firstRealPaidLaunchCandidate ? (() => {
              const firstRealPaidCommercialContext = getOverviewCommercialContext(
                firstRealPaidLaunchCandidate.company,
                firstRealPaidLaunchCandidate.subscription,
                latestDemoRequestByCompanyId.get(firstRealPaidLaunchCandidate.company.id) || null,
                { nextStep: firstRealPaidLaunchCandidate.nextStep }
              );

              return (
                <article className={`platform-priority-hero readiness-${firstRealPaidLaunchCandidate.goLive.readiness}`}>
                <div className="platform-priority-hero-main">
                    <div className="platform-priority-hero-head">
                      <div>
                        <span className="platform-priority-hero-label">Сейчас закрываем</span>
                        <h3>{firstRealPaidLaunchCandidate.company.name}</h3>
                      <p>
                        {businessTypeLabels[firstRealPaidLaunchCandidate.company.business_type] || "Автосервис"} ·{" "}
                        {planLabels[firstRealPaidLaunchCandidate.subscription?.plan_code || firstRealPaidLaunchCandidate.company.plan_code || "starter"] || "Старт"}
                      </p>
                    </div>
                    <div className="platform-launch-head-chips">
                      <span className={`platform-status-chip status-${firstRealPaidLaunchCandidate.company.status}`}>
                        {formatCompanyStatus(firstRealPaidLaunchCandidate.company.status)}
                      </span>
                      <span className={`platform-status-chip status-${firstRealPaidLaunchCandidate.readiness === "almost_ready" ? "paused" : "archived"}`}>
                        {firstRealPaidLaunchCandidate.readiness === "almost_ready" ? "Почти ready" : "Есть блокеры"}
                      </span>
                      <span className={`platform-commercial-stage tone-${getCommercialCloseStageTone(firstRealPaidLaunchCandidate.commercialStage)}`}>
                        {formatCommercialCloseStage(firstRealPaidLaunchCandidate.commercialStage)}
                      </span>
                      {firstRealPaidLaunchCandidate.readyPackEligible ? (
                        <span className="platform-status-chip lane-ready">Ready pack</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="platform-priority-hero-next">
                    <strong>Что закрываем сейчас</strong>
                    <span>{firstRealPaidLaunchCandidate.nextStep}</span>
                  </div>

                  <div className="platform-priority-hero-blockers">
                    {firstRealPaidLaunchCandidate.blockers.slice(0, 4).map((blocker) => (
                      <div key={`${firstRealPaidLaunchCandidate.company.id}-${blocker.key}`} className="platform-priority-hero-blocker">
                        <span>Шаг</span>
                        <strong>{blocker.label}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="platform-priority-hero-side">
                  <div className="platform-priority-hero-meta">
                    <span>Контакт</span>
                    <strong>{firstRealPaidLaunchCandidate.company.owner_email || firstRealPaidLaunchCandidate.company.contact_email || firstRealPaidLaunchCandidate.company.contact_phone || "Не указан"}</strong>
                  </div>
                  <div className="platform-priority-hero-meta">
                    <span>Billing</span>
                    <strong>{formatBillingStatus(firstRealPaidLaunchCandidate.subscription?.billing_status || "trial")}</strong>
                  </div>
                  <div className="platform-priority-hero-meta">
                    <span>Незакрыто</span>
                    <strong>{firstRealPaidLaunchCandidate.goLive.unresolvedCount}</strong>
                  </div>
                  <div className="platform-priority-hero-meta">
                    <span>Сумма</span>
                    <strong>
                      {firstRealPaidCommercialContext.chargeAmount
                        ? `${platformEurFormatter.format(firstRealPaidCommercialContext.chargeAmount)} ${firstRealPaidCommercialContext.chargeSuffix}`
                        : "Уточнить вручную"}
                    </strong>
                  </div>
                  <div className="platform-priority-hero-meta">
                    <span>Срок оплаты</span>
                    <strong>{firstRealPaidCommercialContext.paymentDueAt ? formatDateTime(firstRealPaidCommercialContext.paymentDueAt) : "Не задан"}</strong>
                  </div>

                  {firstRealPaidLaunchPrimaryAction ? (
                    <div className="platform-company-closer-note">
                      <strong>Рекомендуемый шаг:</strong>
                      <span>{firstRealPaidLaunchPrimaryAction.note}</span>
                    </div>
                  ) : null}

                  <div className="platform-launch-actions">
                    {firstRealPaidLaunchPrimaryAction ? (
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={
                          subscriptionSavingId === firstRealPaidLaunchCandidate.company.id ||
                          launchBundleSavingId === firstRealPaidLaunchCandidate.company.id ||
                          starterAccessCreatingId === firstRealPaidLaunchCandidate.company.id ||
                          companyPackApplyingId === firstRealPaidLaunchCandidate.company.id
                        }
                        onClick={() =>
                          executePrimaryPaidAction(
                            firstRealPaidLaunchPrimaryAction.key,
                            firstRealPaidLaunchCandidate,
                            latestDemoRequestByCompanyId.get(firstRealPaidLaunchCandidate.company.id) || null
                          )
                        }
                      >
                        {firstRealPaidLaunchPrimaryAction.label}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={subscriptionSavingId === firstRealPaidLaunchCandidate.company.id}
                      onClick={() =>
                        applyOverviewPaidAction(
                          "prepare_manual",
                          firstRealPaidLaunchCandidate.company,
                          firstRealPaidLaunchCandidate.subscription,
                          latestDemoRequestByCompanyId.get(firstRealPaidLaunchCandidate.company.id) || null
                        )
                      }
                    >
                      Manual
                    </button>
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={subscriptionSavingId === firstRealPaidLaunchCandidate.company.id}
                      onClick={() =>
                        applyOverviewPaidAction(
                          "invoice_sent",
                          firstRealPaidLaunchCandidate.company,
                          firstRealPaidLaunchCandidate.subscription,
                          latestDemoRequestByCompanyId.get(firstRealPaidLaunchCandidate.company.id) || null
                        )
                      }
                    >
                      Sent
                    </button>
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={subscriptionSavingId === firstRealPaidLaunchCandidate.company.id}
                      onClick={() =>
                        applyOverviewPaidAction(
                          "confirm_paid",
                          firstRealPaidLaunchCandidate.company,
                          firstRealPaidLaunchCandidate.subscription,
                          latestDemoRequestByCompanyId.get(firstRealPaidLaunchCandidate.company.id) || null
                        )
                      }
                    >
                      Paid
                    </button>
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() =>
                        copyOverviewBillingPack(
                          firstRealPaidLaunchCandidate.company,
                          firstRealPaidLaunchCandidate.subscription,
                          latestDemoRequestByCompanyId.get(firstRealPaidLaunchCandidate.company.id) || null,
                          firstRealPaidLaunchCandidate.nextStep
                        )
                      }
                    >
                      Pack
                    </button>
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() =>
                        copyOverviewOwnerBillingPack(
                          firstRealPaidLaunchCandidate.company,
                          firstRealPaidLaunchCandidate.subscription,
                          latestDemoRequestByCompanyId.get(firstRealPaidLaunchCandidate.company.id) || null,
                          firstRealPaidLaunchCandidate.nextStep
                        )
                      }
                    >
                      Owner msg
                    </button>
                    {firstRealPaidLaunchCandidate.readyPackEligible ? (
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={launchBundleSavingId === firstRealPaidLaunchCandidate.company.id || starterAccessCreatingId === firstRealPaidLaunchCandidate.company.id}
                        onClick={() =>
                          onApplyPlatformFullLaunchBundle?.(
                            firstRealPaidLaunchCandidate.company.id,
                            getOverviewLaunchOptions(
                              firstRealPaidLaunchCandidate.company,
                              firstRealPaidLaunchCandidate.subscription,
                              latestDemoRequestByCompanyId.get(firstRealPaidLaunchCandidate.company.id) || null
                            )
                          )
                        }
                      >
                        Ready pack
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => {
                        setActiveView("companies");
                        setCompanyMode("launch");
                        setFocusedCompanyId(firstRealPaidLaunchCandidate.company.id);
                      }}
                    >
                      Открыть компанию
                    </button>
                  </div>
                </div>
              </article>
              );
            })() : (
              <div className="platform-empty-stack">
                <div className="empty-state">
                  {firstRealOnboardingCandidate
                    ? "Реальный owner-лид уже есть, но он ещё не доведён до отдельной живой компании в paid close."
                    : "Сейчас в paid close нет ни одной живой компании: demo-контур уже готов, дальше нужен первый реальный owner-лид с витрины."}
                </div>
                <div className="platform-launch-summary-grid">
                  <article className="platform-launch-summary-card">
                    <span>Реальных лидов</span>
                    <strong>{demoRequestSummary.realCount}</strong>
                    <p>{firstRealOnboardingCandidate ? "Есть кого переводить из storefront в компанию." : "Пока ждём первый реальный входящий лид."}</p>
                  </article>
                  <article className="platform-launch-summary-card">
                    <span>Реальных в paid close</span>
                    <strong>{realPaidOnboardingSummary.waiting}</strong>
                    <p>{realPaidOnboardingSummary.waiting ? "Есть живые компании, но они ещё не выбраны как первый paid close." : "Ещё нет ни одной живой компании в коммерческом закрытии."}</p>
                  </article>
                  <article className="platform-launch-summary-card">
                    <span>Demo ready bench</span>
                    <strong>{demoPaidOnboardingRows.filter((item) => !item.paidReady).length}</strong>
                    <p>Demo-компании остаются контрольной скамейкой и не подменяют первый живой запуск.</p>
                  </article>
                  {firstDemoPaidLaunchCandidate ? (
                    <article className="platform-launch-summary-card">
                      <span>Demo next</span>
                      <strong>{firstDemoPaidLaunchCandidate.company.name}</strong>
                      <p>{firstDemoPaidLaunchCandidate.nextStep}</p>
                    </article>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Commercial close</span>
                <h2>Что нужно закрыть, чтобы дожать компании до оплаты</h2>
              </div>
              <div className="section-title-aux">
                <span>{commercialCloseRows.length} компаний в closing-очереди</span>
              </div>
            </div>

            <div className="platform-launch-summary-grid">
              <article className="platform-launch-summary-card launch-almost">
                <span>Только billing</span>
                <strong>{commercialCloseSummary.billingOnly}</strong>
                <p>Контур уже собран, осталось лишь выбрать `manual` или `active` оплату.</p>
              </article>
              <article className="platform-launch-summary-card launch-risk">
                <span>Не active</span>
                <strong>{commercialCloseSummary.companyInactive}</strong>
                <p>Компании, которые creator ещё не перевёл в `active` перед коммерческим запуском.</p>
              </article>
              <article className="platform-launch-summary-card launch-risk">
                <span>Нет команды</span>
                <strong>{commercialCloseSummary.teamMissing}</strong>
                <p>Нужно выдать starter bundle или подключить хотя бы одного `manager/master`.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Можно в manual</span>
                <strong>{commercialCloseSummary.billingOpen}</strong>
                <p>Компании, которые уже можно закрывать через `manual billing` без лишнего ожидания.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Manual prepared</span>
                <strong>{paidOnboardingSummary.manualPrepared}</strong>
                <p>Сумма и контур уже собраны, следующий шаг для creator: отправить счёт владельцу.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Invoice sent</span>
                <strong>{paidOnboardingSummary.invoiceSent}</strong>
                <p>Счёт уже ушёл, теперь не теряем компанию и доводим до `payment confirmed`.</p>
              </article>
              <article className="platform-launch-summary-card launch-ready">
                <span>Готовы к ready pack</span>
                <strong>{commercialCloseSummary.readyPackEligible}</strong>
                <p>Типовые блокеры можно закрыть одной creator-пачкой: `active + team + services + manual`.</p>
              </article>
            </div>

            {commercialCloseRows.length ? (
              <div className="platform-launch-grid">
                {commercialCloseRows.map((item) => {
                  const linkedDemoRequest = latestDemoRequestByCompanyId.get(item.company.id) || null;
                  const hasCompanyInactive = item.blockers.some((blocker) => blocker.sourceKey === "company_status");
                  const hasSubscriptionMissing = item.blockers.some((blocker) => blocker.sourceKey === "subscription");
                  const hasTeamMissing = item.blockers.some((blocker) => blocker.sourceKey === "members");
                  const billingOnly = item.blockers.length === 1 && item.blockers[0]?.sourceKey === "billing";
                  const commercialContext = getOverviewCommercialContext(item.company, item.subscription, linkedDemoRequest, { nextStep: item.nextStep });
                  const ownerFollowUpAt = getDemoRequestCreatorFollowUpAt(linkedDemoRequest);
                  const ownerFollowUpState = getDemoRequestFollowUpState(linkedDemoRequest);
                  const creatorNote = getDemoRequestCreatorNote(linkedDemoRequest);

                  return (
                    <article key={`${item.company.id}-commercial-close`} className={`platform-launch-card readiness-${item.goLive.readiness}`}>
                      <div className="platform-launch-head">
                        <div>
                          <strong>{item.company.name}</strong>
                          <span>
                            {businessTypeLabels[item.company.business_type] || "Автосервис"} · {planLabels[item.subscription?.plan_code || item.company.plan_code || "starter"] || "Старт"}
                          </span>
                        </div>
                        <div className="platform-launch-head-chips">
                          <span className={`platform-status-chip status-${item.company.status}`}>{formatCompanyStatus(item.company.status)}</span>
                          <span className={`platform-status-chip status-${item.readiness === "almost_ready" ? "paused" : "archived"}`}>
                            {item.readiness === "almost_ready" ? "Почти ready" : "Есть блокеры"}
                          </span>
                          <span className={`platform-commercial-stage tone-${getCommercialCloseStageTone(item.commercialStage)}`}>
                            {formatCommercialCloseStage(item.commercialStage)}
                          </span>
                        </div>
                      </div>

                      <div className="platform-launch-next-step">
                        <strong>Closing-фокус</strong>
                        <span>{item.nextStep}</span>
                      </div>

                      <div className="platform-launch-list">
                        <div className="platform-launch-row">
                          <span>Owner</span>
                          <strong>{commercialContext.ownerEmail || item.company.owner_email || item.company.contact_email || "Не указан"}</strong>
                        </div>
                        <div className="platform-launch-row">
                          <span>Сумма</span>
                          <strong>
                            {commercialContext.chargeAmount
                              ? `${platformEurFormatter.format(commercialContext.chargeAmount)} ${commercialContext.chargeSuffix}`
                              : "Уточнить вручную"}
                          </strong>
                        </div>
                        <div className="platform-launch-row">
                          <span>Срок оплаты</span>
                          <strong>{commercialContext.paymentDueAt ? formatDateTime(commercialContext.paymentDueAt) : "Не задан"}</strong>
                        </div>
                        <div className="platform-launch-row">
                          <span>Follow-up</span>
                          <strong>
                            {ownerFollowUpAt
                              ? `${formatDemoRequestFollowUpState(ownerFollowUpState)} · ${formatDateTime(ownerFollowUpAt)}`
                              : "Не задан"}
                          </strong>
                        </div>
                      </div>

                      {creatorNote ? (
                        <div className="platform-company-closer-note">
                          <strong>Заметка creator:</strong>
                          <span>{creatorNote}</span>
                        </div>
                      ) : null}

                      <div className="platform-launch-list">
                        {item.blockers.slice(0, 4).map((blocker) => (
                          <div key={`${item.company.id}-${blocker.key}`} className="platform-launch-row todo">
                            <span>Шаг</span>
                            <strong>{blocker.label}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="platform-launch-actions">
                        {hasCompanyInactive ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={subscriptionSavingId === item.company.id}
                            onClick={() => applyOverviewStatusAction("active", item.company, item.subscription, linkedDemoRequest)}
                          >
                            Active
                          </button>
                        ) : null}
                        {hasSubscriptionMissing ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={subscriptionSavingId === item.company.id}
                            onClick={() => bootstrapOverviewSubscription(item.company, item.subscription, linkedDemoRequest)}
                          >
                            Подписка
                          </button>
                        ) : null}
                        {hasTeamMissing ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={starterAccessCreatingId === item.company.id}
                            onClick={() => onCreatePlatformStarterBundle?.(item.company.id)}
                          >
                            Starter bundle
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={subscriptionSavingId === item.company.id}
                          onClick={() => applyOverviewPaidAction("prepare_manual", item.company, item.subscription, linkedDemoRequest)}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={subscriptionSavingId === item.company.id}
                          onClick={() => applyOverviewPaidAction("invoice_sent", item.company, item.subscription, linkedDemoRequest)}
                        >
                          Sent
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={subscriptionSavingId === item.company.id}
                          onClick={() => applyOverviewPaidAction("confirm_paid", item.company, item.subscription, linkedDemoRequest)}
                        >
                          Paid
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={subscriptionSavingId === item.company.id}
                          onClick={() => applyOverviewPaidAction("pause_after_no_payment", item.company, item.subscription, linkedDemoRequest)}
                        >
                          Pause
                        </button>
                        {(billingOnly || item.manualBillingRecommended) ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={launchBundleSavingId === item.company.id || starterAccessCreatingId === item.company.id}
                            onClick={() =>
                              onApplyPlatformFullLaunchBundle?.(
                                item.company.id,
                                getOverviewLaunchOptions(item.company, item.subscription, linkedDemoRequest)
                              )
                            }
                          >
                            Full manual
                          </button>
                        ) : null}
                        {item.readyPackEligible ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={launchBundleSavingId === item.company.id || starterAccessCreatingId === item.company.id}
                            onClick={() =>
                              onApplyPlatformFullLaunchBundle?.(
                                item.company.id,
                                getOverviewLaunchOptions(item.company, item.subscription, linkedDemoRequest)
                              )
                            }
                          >
                            Ready pack
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => linkedDemoRequest && openDemoRequestById(linkedDemoRequest.id, linkedDemoRequest.status || "all")}
                          disabled={!linkedDemoRequest}
                        >
                          Handoff
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => {
                            setActiveView("companies");
                            setCompanyMode("launch");
                            setFocusedCompanyId(item.company.id);
                          }}
                        >
                          Открыть компанию
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">Сейчас в commercial closing нет компаний, которые нужно отдельно дожимать.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Closing queues</span>
                <h2>Очереди по типу blocker, чтобы не сканировать все компании вручную</h2>
              </div>
              <div className="section-title-aux">
                <span>{commercialCloseQueues.length} активных очередей</span>
              </div>
            </div>

            {commercialCloseQueues.length ? (
              <div className="platform-close-queue-grid">
                {commercialCloseQueues.map((queue) => (
                  <article key={queue.key} className={`platform-close-queue-card queue-${queue.accent}`}>
                    <div className="platform-close-queue-head">
                      <div>
                        <span>{queue.title}</span>
                        <strong>{queue.count}</strong>
                      </div>
                      <p>{queue.note}</p>
                    </div>

                    <div className="platform-close-queue-list">
                      {queue.preview.map((item) => {
                        const linkedDemoRequest = latestDemoRequestByCompanyId.get(item.company.id) || null;
                        return (
                          <div key={`${queue.key}-${item.company.id}`} className="platform-close-queue-row">
                            <div>
                              <strong>{item.company.name}</strong>
                              <span>{item.nextStep}</span>
                            </div>
                            <div className="platform-launch-actions">
                              {queue.key === "company_status" ? (
                                <button
                                  type="button"
                                  className="button button-outline"
                                  disabled={subscriptionSavingId === item.company.id}
                                  onClick={() => applyOverviewStatusAction("active", item.company, item.subscription, linkedDemoRequest)}
                                >
                                  Active
                                </button>
                              ) : null}
                              {queue.key === "members" ? (
                                <button
                                  type="button"
                                  className="button button-outline"
                                  disabled={starterAccessCreatingId === item.company.id}
                                  onClick={() => onCreatePlatformStarterBundle?.(item.company.id)}
                                >
                                  Starter bundle
                                </button>
                              ) : null}
                              {queue.key === "services" || queue.key === "billing_only" ? (
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  disabled={launchBundleSavingId === item.company.id || starterAccessCreatingId === item.company.id}
                                  onClick={() =>
                                    onApplyPlatformFullLaunchBundle?.(
                                      item.company.id,
                                      getOverviewLaunchOptions(item.company, item.subscription, linkedDemoRequest)
                                    )
                                  }
                                >
                                  Ready pack
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="button button-outline"
                                onClick={() => {
                                  setActiveView("companies");
                                  setCompanyMode("launch");
                                  setFocusedCompanyId(item.company.id);
                                }}
                              >
                                Открыть
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Сейчас активных closing-очередей по типовым blocker-типам нет.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Commercial stages</span>
                <h2>Где именно зависают компании по оплате</h2>
              </div>
              <div className="section-title-aux">
                <span>{commercialStageQueues.length} активных стадий</span>
              </div>
            </div>

            <div className="crm-summary-bar platform-company-summary-bar">
              <span>{paidOnboardingSummary.notStarted} не начато</span>
              <span>{paidOnboardingSummary.manualPrepared} manual prepared</span>
              <span>{paidOnboardingSummary.invoiceSent} invoice sent</span>
              <span>{paidOnboardingSummary.paymentPaused} на паузе</span>
            </div>

            {commercialStageQueues.length ? (
              <div className="platform-close-queue-grid">
                {commercialStageQueues.map((queue) => (
                  <article key={queue.key} className={`platform-close-queue-card queue-${queue.accent}`}>
                    <div className="platform-close-queue-head">
                      <div>
                        <span>{queue.title}</span>
                        <strong>{queue.count}</strong>
                      </div>
                      <p>{queue.note}</p>
                    </div>

                    <div className="platform-close-queue-list">
                      {queue.preview.map((item) => {
                        const linkedDemoRequest = latestDemoRequestByCompanyId.get(item.company.id) || null;
                        return (
                          <div key={`${queue.key}-${item.company.id}`} className="platform-close-queue-row">
                            <div>
                              <strong>{item.company.name}</strong>
                              <span>{item.nextStep}</span>
                            </div>
                            <div className="platform-launch-actions">
                              {queue.key === "not_started" ? (
                                <button
                                  type="button"
                                  className="button button-outline"
                                  disabled={subscriptionSavingId === item.company.id}
                                  onClick={() => applyOverviewPaidAction("prepare_manual", item.company, item.subscription, linkedDemoRequest)}
                                >
                                  Manual
                                </button>
                              ) : null}
                              {queue.key === "manual_prepared" ? (
                                <button
                                  type="button"
                                  className="button button-outline"
                                  disabled={subscriptionSavingId === item.company.id}
                                  onClick={() => applyOverviewPaidAction("invoice_sent", item.company, item.subscription, linkedDemoRequest)}
                                >
                                  Sent
                                </button>
                              ) : null}
                              {queue.key === "invoice_sent" ? (
                                <button
                                  type="button"
                                  className="button button-outline"
                                  disabled={subscriptionSavingId === item.company.id}
                                  onClick={() => applyOverviewPaidAction("confirm_paid", item.company, item.subscription, linkedDemoRequest)}
                                >
                                  Paid
                                </button>
                              ) : null}
                              {queue.key === "payment_paused" ? (
                                <button
                                  type="button"
                                  className="button button-outline"
                                  disabled={subscriptionSavingId === item.company.id}
                                  onClick={() => applyOverviewPaidAction("prepare_manual", item.company, item.subscription, linkedDemoRequest)}
                                >
                                  Manual
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="button button-outline"
                                onClick={() =>
                                  copyOverviewBillingPack(item.company, item.subscription, linkedDemoRequest, item.nextStep)
                                }
                              >
                                Pack
                              </button>
                              <button
                                type="button"
                                className="button button-outline"
                                onClick={() => {
                                  setActiveView("companies");
                                  setCompanyMode("paid");
                                  setFocusedCompanyId(item.company.id);
                                }}
                              >
                                Открыть
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Сейчас коммерческие стадии не требуют отдельного разбора.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Paid onboarding</span>
                <h2>Кого уже можно переводить в реальные оплаты</h2>
              </div>
              <div className="section-title-aux">
                <span>{paidOnboardingPriorityRows.length} компаний в коммерческом приоритете</span>
              </div>
            </div>

            <div className="platform-launch-summary-grid">
              <article className="platform-launch-summary-card launch-ready">
                <span>Готовы к оплате</span>
                <strong>{paidOnboardingSummary.ready}</strong>
                <p>Контур закрыт: company active, owner подключён, услуги есть, billing уже paid/manual.</p>
              </article>
              <article className="platform-launch-summary-card launch-almost">
                <span>Почти готовы</span>
                <strong>{paidOnboardingSummary.almostReady}</strong>
                <p>Осталось 1-2 шага, чтобы компания уверенно ушла в реальный запуск.</p>
              </article>
              <article className="platform-launch-summary-card launch-risk">
                <span>Блокеры</span>
                <strong>{paidOnboardingSummary.blocked}</strong>
                <p>Есть пробелы по owner, services, company status, subscription или handoff.</p>
              </article>
              <article className="platform-launch-summary-card">
                <span>Billing-сигналы</span>
                <strong>{paidOnboardingSummary.manual + paidOnboardingSummary.trial + paidOnboardingSummary.pastDue}</strong>
                <p>
                  Manual: {paidOnboardingSummary.manual} · Trial: {paidOnboardingSummary.trial} · Past due: {paidOnboardingSummary.pastDue}
                </p>
              </article>
            </div>

            {paidOnboardingPriorityRows.length ? (
              <div className="platform-launch-grid">
                {paidOnboardingPriorityRows.map(({ company, subscription, activation, goLive, billingStatus, paidReady, blockers, nextStep, readiness, commercialStage }) => (
                  <article key={`${company.id}-launch`} className={`platform-launch-card readiness-${goLive.readiness}`}>
                    <div className="platform-launch-head">
                      <div>
                        <strong>{company.name}</strong>
                        <span>
                          {businessTypeLabels[company.business_type] || "Автосервис"} · {planLabels[subscription?.plan_code || company.plan_code || "starter"] || "Старт"}
                        </span>
                      </div>
                      <div className="platform-launch-head-chips">
                        <span className={`platform-status-chip status-${company.status}`}>{formatCompanyStatus(company.status)}</span>
                        <span className={`platform-status-chip status-${paidReady ? "active" : readiness === "almost_ready" ? "paused" : "archived"}`}>
                          {paidReady ? "Готова к оплате" : readiness === "almost_ready" ? "Почти готова" : "Есть блокеры"}
                        </span>
                        <span className={`platform-commercial-stage tone-${getCommercialCloseStageTone(commercialStage)}`}>
                          {formatCommercialCloseStage(commercialStage)}
                        </span>
                        {activation ? (
                          <span className={`platform-status-chip activation-stage-chip stage-${activation.stage}`}>
                            {formatActivationStage(activation.stage)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="platform-launch-next-step">
                      <strong>Следующий шаг</strong>
                      <span>{nextStep}</span>
                    </div>
                    <div className="platform-launch-list">
                      {(blockers.length
                        ? blockers.map((item) => ({ ...item, done: false }))
                        : goLive.items
                      ).slice(0, 5).map((item) => (
                        <div key={`${company.id}-${item.key}`} className={`platform-launch-row ${item.done ? "done" : "todo"}`}>
                          <span>{item.done ? "OK" : "Шаг"}</span>
                          <strong>{item.label}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="platform-launch-foot">
                      <span>{formatBillingStatus(subscription?.billing_status || "trial")} · {company.owner_email || company.contact_email || "Без контакта"}</span>
                      <div className="platform-launch-actions">
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={subscriptionSavingId === company.id}
                          onClick={() =>
                            applyOverviewPaidAction(
                              "prepare_manual",
                              company,
                              subscription,
                              latestDemoRequestByCompanyId.get(company.id) || null
                            )
                          }
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={subscriptionSavingId === company.id}
                          onClick={() =>
                            applyOverviewPaidAction(
                              "invoice_sent",
                              company,
                              subscription,
                              latestDemoRequestByCompanyId.get(company.id) || null
                            )
                          }
                        >
                          Sent
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={subscriptionSavingId === company.id}
                          onClick={() =>
                            applyOverviewPaidAction(
                              "confirm_paid",
                              company,
                              subscription,
                              latestDemoRequestByCompanyId.get(company.id) || null
                            )
                          }
                        >
                          Paid
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() =>
                            copyOverviewBillingPack(
                              company,
                              subscription,
                              latestDemoRequestByCompanyId.get(company.id) || null,
                              nextStep
                            )
                          }
                        >
                          Pack
                        </button>
                        {((blockers.length > 0 && blockers.every((item) => ["company_status", "members", "billing", "services"].includes(item.sourceKey))) || readiness === "almost_ready") ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={launchBundleSavingId === company.id || starterAccessCreatingId === company.id}
                            onClick={() =>
                              onApplyPlatformFullLaunchBundle?.(
                                company.id,
                                getOverviewLaunchOptions(
                                  company,
                                  subscription,
                                  latestDemoRequestByCompanyId.get(company.id) || null
                                )
                              )
                            }
                          >
                            Ready pack
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={launchBundleSavingId === company.id || starterAccessCreatingId === company.id}
                          onClick={() =>
                            onApplyPlatformFullLaunchBundle?.(
                              company.id,
                              getOverviewLaunchOptions(
                                company,
                                subscription,
                                latestDemoRequestByCompanyId.get(company.id) || null
                              )
                            )
                          }
                        >
                          Full manual
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => {
                            setActiveView("companies");
                            setCompanyMode("launch");
                            setFocusedCompanyId(company.id);
                          }}
                        >
                          Открыть компанию
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Пока нет компаний, которые уже имеют смысл переводить в реальные оплаты.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Launch pipeline</span>
                <h2>Кто именно кого сейчас ждёт</h2>
              </div>
              <div className="section-title-aux">
                <span>{launchPipelinePriorityRows.length} компаний в операционном запуске</span>
              </div>
            </div>

            <div className="platform-launch-lane-grid">
              <article className="platform-launch-lane-card lane-handoff">
                <span>Handoff</span>
                <strong>{launchPipelineSummary.handoff}</strong>
                <p>Заявка пришла, но creator ещё не закрыл связку с компанией и подпиской.</p>
              </article>
              <article className="platform-launch-lane-card lane-owner">
                <span>Owner</span>
                <strong>{launchPipelineSummary.owner}</strong>
                <p>Компания уже создана, но owner ещё не доведён до первого входа.</p>
              </article>
              <article className="platform-launch-lane-card lane-team">
                <span>Team</span>
                <strong>{launchPipelineSummary.team}</strong>
                <p>Owner подключён, но команда ещё не вошла в рабочий контур.</p>
              </article>
              <article className="platform-launch-lane-card lane-services">
                <span>Services</span>
                <strong>{launchPipelineSummary.services + launchPipelineSummary.activation}</strong>
                <p>Нужно дожать услуги или финальную активацию компании.</p>
              </article>
              <article className="platform-launch-lane-card lane-billing">
                <span>Billing</span>
                <strong>{launchPipelineSummary.billing}</strong>
                <p>Зависли на trial, оплате, паузе или решении по переводу в paid.</p>
              </article>
              <article className="platform-launch-lane-card lane-ready">
                <span>Ready</span>
                <strong>{launchPipelineSummary.ready}</strong>
                <p>Контур собран, можно вести в реальные деньги и спокойное сопровождение.</p>
              </article>
            </div>

            {launchPipelinePriorityRows.length ? (
              <div className="platform-launch-pipeline-list">
                {launchPipelinePriorityRows.map(({ company, subscription, activation, goLive, lane }) => (
                  <article key={`${company.id}-lane`} className={`platform-launch-pipeline-card lane-${lane.accent}`}>
                    <div className="platform-launch-pipeline-head">
                      <div>
                        <strong>{company.name}</strong>
                        <span>
                          {businessTypeLabels[company.business_type] || "Автосервис"} · {planLabels[subscription?.plan_code || company.plan_code || "starter"] || "Старт"}
                        </span>
                      </div>
                      <div className="platform-launch-head-chips">
                        <span className={`platform-status-chip status-${company.status}`}>{formatCompanyStatus(company.status)}</span>
                        <span className={`platform-status-chip lane-${lane.accent}`}>{lane.title}</span>
                        {activation ? (
                          <span className={`platform-status-chip activation-stage-chip stage-${activation.stage}`}>
                            {formatActivationStage(activation.stage)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <strong className="platform-launch-pipeline-next">{lane.note}</strong>
                    <div className="platform-launch-pipeline-items">
                      {goLive.items.filter((item) => !item.done).slice(0, 3).map((item) => (
                        <div key={`${company.id}-pipeline-${item.key}`} className="platform-launch-pipeline-item">
                          {item.label}
                        </div>
                      ))}
                    </div>
                    <div className="platform-launch-foot">
                      <span>{company.owner_email || company.contact_email || "Без контакта"} · {formatBillingStatus(subscription?.billing_status || "trial")}</span>
                      <div className="platform-launch-actions">
                        {lane.key === "billing" ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={launchBundleSavingId === company.id || starterAccessCreatingId === company.id}
                          onClick={() =>
                            onApplyPlatformFullLaunchBundle?.(
                              company.id,
                              getOverviewLaunchOptions(
                                company,
                                  subscription,
                                  latestDemoRequestByCompanyId.get(company.id) || null
                                )
                              )
                            }
                          >
                            Full manual
                          </button>
                        ) : null}
                        {["owner", "team", "services", "billing", "activation"].includes(lane.key) ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={launchBundleSavingId === company.id || starterAccessCreatingId === company.id}
                            onClick={() =>
                              onApplyPlatformFullLaunchBundle?.(
                                company.id,
                                getOverviewLaunchOptions(
                                  company,
                                  subscription,
                                  latestDemoRequestByCompanyId.get(company.id) || null
                                )
                              )
                            }
                          >
                            Ready pack
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => {
                            setActiveView("companies");
                            setCompanyMode("launch");
                            setFocusedCompanyId(company.id);
                          }}
                        >
                          Открыть компанию
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Сейчас нет компаний, застрявших в операционном запуске.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Контроль рисков</span>
                <h2>Что требует внимания</h2>
              </div>
              <div className="section-title-aux">
                <span>{attentionCompanies.length} компаний с сигналами</span>
              </div>
            </div>

            {attentionCompanies.length ? (
              <div className="platform-attention-grid">
                {attentionCompanies.map(({ company, subscription, reasons }) => (
                  <article key={company.id} className="platform-attention-card">
                    <div className="platform-attention-head">
                      <div>
                        <strong>{company.name}</strong>
                        <span>
                          {businessTypeLabels[company.business_type] || "Автосервис"} ·{" "}
                          {planLabels[subscription?.plan_code || company.plan_code || "starter"] || "Старт"}
                        </span>
                      </div>
                      <span className={`platform-status-chip status-${company.status}`}>{formatCompanyStatus(company.status)}</span>
                    </div>
                    <div className="platform-attention-list">
                      {reasons.map((reason) => (
                        <div key={reason} className="platform-attention-row">
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Сейчас по лимитам, триалам и оплате всё спокойно.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Renewal radar</span>
                <h2>Что скоро заканчивается или продлевается</h2>
              </div>
              <div className="section-title-aux">
                <span>{renewalRadar.length} компаний в горизонте</span>
              </div>
            </div>

            {renewalRadar.length ? (
              <div className="platform-renewal-list">
                {renewalRadar.map((item) => (
                  <article key={`${item.company.id}-${item.kind}`} className="platform-renewal-card">
                    <div>
                      <strong>{item.company.name}</strong>
                      <span>
                        {item.kind === "renewal"
                          ? item.daysLeft === 0
                            ? "Продление сегодня"
                            : `Продление через ${item.daysLeft} дн.`
                          : item.daysLeft < 0
                          ? "Триал уже истёк"
                          : item.daysLeft === 0
                          ? "Триал заканчивается сегодня"
                          : `Триал закончится через ${item.daysLeft} дн.`}
                      </span>
                    </div>
                    <div className="platform-renewal-meta">
                      <b>{item.date ? formatDate(item.date) : "—"}</b>
                      <button type="button" className="button button-ghost" onClick={() => {
                        setActiveView("companies");
                        setFocusedCompanyId(item.company.id);
                      }}>
                        Открыть
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">В ближайшем горизонте нет триалов и продлений, требующих внимания.</div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">SaaS-входящий поток</span>
                <h2>Последние запросы на демо</h2>
              </div>
              <div className="section-title-aux">
                <span>{recentDemoRequests.length} последних заявок</span>
              </div>
            </div>

            {recentDemoRequests.length ? (
              <div className="platform-history-list">
                {recentDemoRequests.map((request) => (
                  <article key={request.id} className="platform-history-item">
                    <div className="platform-history-head">
                      <strong>{request.name}</strong>
                      <span>{formatDateTime(request.created_at)}</span>
                    </div>
                    <div className="platform-history-meta">
                      <span>{request.phone}</span>
                      <span>{businessTypeLabels[request.business_type] || request.business_type || "Бизнес не указан"}</span>
                      <span>{formatDemoRequestStatus(request.status)}</span>
                      {getDemoRequestCommerceSnapshot(request).plan ? <span>Пакет: {getDemoRequestCommerceSnapshot(request).plan}</span> : null}
                      {getDemoRequestCommerceSnapshot(request).billing ? <span>{getDemoRequestCommerceSnapshot(request).billing}</span> : null}
                    </div>
                    <p>{request.comment || "Без комментария."}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Пока нет новых запросов на демо с витрины.</div>
            )}
          </section>
            </>
          ) : null}
        </>
      ) : null}

      {activeView === "companies" ? (
        <section className="surface-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Компании</span>
              <h2>Подключенные центры без ручного хаоса</h2>
            </div>
            <div className="section-title-aux">
              <span>{companiesPanelRows.length} в текущем режиме</span>
            </div>
          </div>

          <div className="platform-company-mode-bar">
            <button type="button" className={`tab-button ${companyMode === "attention" ? "active" : ""}`} onClick={() => setCompanyMode("attention")}>
              Нужны действия
            </button>
            <button type="button" className={`tab-button ${companyMode === "launch" ? "active" : ""}`} onClick={() => setCompanyMode("launch")}>
              Быстрый запуск
            </button>
            <button type="button" className={`tab-button ${companyMode === "paid" ? "active" : ""}`} onClick={() => setCompanyMode("paid")}>
              Оплата
            </button>
            <button type="button" className={`tab-button ${companyMode === "billing" ? "active" : ""}`} onClick={() => setCompanyMode("billing")}>
              Billing
            </button>
            <button type="button" className={`tab-button ${companyMode === "autopilot" ? "active" : ""}`} onClick={() => setCompanyMode("autopilot")}>
              Активные
            </button>
            <button type="button" className={`tab-button ${companyMode === "recent" ? "active" : ""}`} onClick={() => setCompanyMode("recent")}>
              Новые
            </button>
            <button type="button" className={`tab-button ${companyMode === "all" ? "active" : ""}`} onClick={() => setCompanyMode("all")}>
              Все
            </button>
          </div>

          <div className="crm-summary-bar platform-company-summary-bar">
            <span>{companiesPanelCounts.attention} требуют внимания</span>
            <span>{companiesPanelCounts.launch} в запуске</span>
            <span>{companiesPanelCounts.paid} ждут оплату</span>
            <span>{companiesPanelCounts.autopilot} стабильны</span>
            <span>{companiesPanelCounts.all} всего по фильтру</span>
          </div>

          {false && companyMode === "handoff" ? (
            <>
              <div className="platform-company-mode-bar platform-company-subfilters">
                <button type="button" className={`tab-button ${companyHandoffFilter === "all" ? "active" : ""}`} onClick={() => setCompanyHandoffFilter("all")}>
                  Все
                </button>
                <button type="button" className={`tab-button ${companyHandoffFilter === "action" ? "active" : ""}`} onClick={() => setCompanyHandoffFilter("action")}>
                  Нужен шаг
                </button>
                <button
                  type="button"
                  className={`tab-button ${companyHandoffFilter === "no_subscription" ? "active" : ""}`}
                  onClick={() => setCompanyHandoffFilter("no_subscription")}
                >
                  Без подписки
                </button>
                <button
                  type="button"
                  className={`tab-button ${companyHandoffFilter === "plan_mismatch" ? "active" : ""}`}
                  onClick={() => setCompanyHandoffFilter("plan_mismatch")}
                >
                  Мимо тарифа
                </button>
                <button
                  type="button"
                  className={`tab-button ${companyHandoffFilter === "not_connected" ? "active" : ""}`}
                  onClick={() => setCompanyHandoffFilter("not_connected")}
                >
                  Не закрыта
                </button>
                <button
                  type="button"
                  className={`tab-button ${companyHandoffFilter === "company_inactive" ? "active" : ""}`}
                  onClick={() => setCompanyHandoffFilter("company_inactive")}
                >
                  Не активна
                </button>
              </div>
              <div className="crm-summary-bar platform-company-summary-bar">
                <span>{companyHandoffSummary.total} компаний в handoff</span>
                <span>{companyHandoffSummary.action} требуют следующего шага</span>
                <span>{companyHandoffSummary.noSubscription} без подписки</span>
                <span>{companyHandoffSummary.planMismatch} с расхождением тарифа</span>
                <span>{companyHandoffSummary.companyInactive} не активны</span>
                <span>{companyHandoffSummary.notConnected} ещё не закрыты как подключение</span>
              </div>
            </>
          ) : null}

          {false && companyMode === "launch" ? (
            <>
              <div className="platform-company-mode-bar platform-company-subfilters">
                <button type="button" className={`tab-button ${launchFilter === "all" ? "active" : ""}`} onClick={() => setLaunchFilter("all")}>
                  Все
                </button>
                <button type="button" className={`tab-button ${launchFilter === "handoff" ? "active" : ""}`} onClick={() => setLaunchFilter("handoff")}>
                  Handoff
                </button>
                <button type="button" className={`tab-button ${launchFilter === "owner" ? "active" : ""}`} onClick={() => setLaunchFilter("owner")}>
                  Owner
                </button>
                <button type="button" className={`tab-button ${launchFilter === "team" ? "active" : ""}`} onClick={() => setLaunchFilter("team")}>
                  Team
                </button>
                <button
                  type="button"
                  className={`tab-button ${launchFilter === "services_activation" ? "active" : ""}`}
                  onClick={() => setLaunchFilter("services_activation")}
                >
                  Services / Active
                </button>
                <button type="button" className={`tab-button ${launchFilter === "billing" ? "active" : ""}`} onClick={() => setLaunchFilter("billing")}>
                  Billing
                </button>
                <button type="button" className={`tab-button ${launchFilter === "ready" ? "active" : ""}`} onClick={() => setLaunchFilter("ready")}>
                  Ready
                </button>
              </div>
              <div className="crm-summary-bar platform-company-summary-bar">
                <span>{filteredLaunchPipelineSummary.total} компаний в launch-срезе</span>
                <span>{filteredLaunchPipelineSummary.handoff} ждут handoff</span>
                <span>{filteredLaunchPipelineSummary.owner} ждут owner</span>
                <span>{filteredLaunchPipelineSummary.team} ждут team</span>
                <span>{filteredLaunchPipelineSummary.billing} ждут billing</span>
                <span>{filteredLaunchPipelineSummary.ready} уже готовы</span>
              </div>
            </>
          ) : null}

          {false && companyMode === "paid" ? (
            <>
              <div className="platform-company-mode-bar platform-company-subfilters">
                <button type="button" className={`tab-button ${paidFilter === "all" ? "active" : ""}`} onClick={() => setPaidFilter("all")}>
                  Все
                </button>
                <button type="button" className={`tab-button ${paidFilter === "almost_ready" ? "active" : ""}`} onClick={() => setPaidFilter("almost_ready")}>
                  Почти ready
                </button>
                <button type="button" className={`tab-button ${paidFilter === "billing_only" ? "active" : ""}`} onClick={() => setPaidFilter("billing_only")}>
                  Только billing
                </button>
                <button type="button" className={`tab-button ${paidFilter === "not_started" ? "active" : ""}`} onClick={() => setPaidFilter("not_started")}>
                  Не начато
                </button>
                <button type="button" className={`tab-button ${paidFilter === "manual_prepared" ? "active" : ""}`} onClick={() => setPaidFilter("manual_prepared")}>
                  Manual ready
                </button>
                <button type="button" className={`tab-button ${paidFilter === "invoice_sent" ? "active" : ""}`} onClick={() => setPaidFilter("invoice_sent")}>
                  Invoice sent
                </button>
                <button type="button" className={`tab-button ${paidFilter === "payment_paused" ? "active" : ""}`} onClick={() => setPaidFilter("payment_paused")}>
                  Пауза
                </button>
                <button type="button" className={`tab-button ${paidFilter === "ready_pack" ? "active" : ""}`} onClick={() => setPaidFilter("ready_pack")}>
                  Ready pack
                </button>
                <button type="button" className={`tab-button ${paidFilter === "blocked" ? "active" : ""}`} onClick={() => setPaidFilter("blocked")}>
                  Blocked
                </button>
              </div>
              <div className="crm-summary-bar platform-company-summary-bar">
                <span>{filteredPaidOnboardingSummary.total} компаний в paid close</span>
                <span>{realPaidOnboardingSummary.waiting} реальных в работе</span>
                <span>{demoPaidOnboardingRows.filter((item) => !item.paidReady).length} demo в bench</span>
                <span>{filteredPaidOnboardingSummary.almostReady} почти готовы</span>
                <span>{filteredPaidOnboardingSummary.billingOnly} только billing</span>
                <span>{filteredPaidOnboardingSummary.notStarted} не начато</span>
                <span>{filteredPaidOnboardingSummary.manualPrepared} manual prepared</span>
                <span>{filteredPaidOnboardingSummary.invoiceSent} invoice sent</span>
                <span>{filteredPaidOnboardingSummary.paymentPaused} пауза</span>
                <span>{filteredPaidOnboardingSummary.readyPack} под ready pack</span>
                <span>{filteredPaidOnboardingSummary.blocked} blocked</span>
              </div>
              {filteredPaidCandidate ? (
                <article className={`platform-paid-focus-card readiness-${filteredPaidCandidate.goLive.readiness}`}>
                  <div className="platform-paid-focus-main">
                    <span className="eyebrow">Current paid focus</span>
                    <strong>{filteredPaidCandidate.company.name}</strong>
                    <p>{filteredPaidCandidate.nextStep}</p>
                    <div className="platform-company-list-signals">
                      {filteredPaidCandidate.blockers.slice(0, 4).map((blocker) => (
                        <span key={`${filteredPaidCandidate.company.id}-${blocker.key}`}>{blocker.label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="platform-paid-focus-meta">
                    <span>{formatBillingStatus(filteredPaidCandidate.subscription?.billing_status || "trial")}</span>
                    <span className={`platform-commercial-stage tone-${getCommercialCloseStageTone(filteredPaidCandidate.commercialStage)}`}>
                      {formatCommercialCloseStage(filteredPaidCandidate.commercialStage)}
                    </span>
                    <span>{filteredPaidCandidate.company.owner_email || filteredPaidCandidate.company.contact_email || "Без контакта"}</span>
                    {filteredPaidPrimaryAction ? (
                      <div className="platform-company-closer-note">
                        <strong>Рекомендуемый шаг:</strong>
                        <span>{filteredPaidPrimaryAction.note}</span>
                      </div>
                    ) : null}
                    <div className="platform-launch-actions">
                      {filteredPaidPrimaryAction ? (
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={
                            subscriptionSavingId === filteredPaidCandidate.company.id ||
                            launchBundleSavingId === filteredPaidCandidate.company.id ||
                            starterAccessCreatingId === filteredPaidCandidate.company.id ||
                            companyPackApplyingId === filteredPaidCandidate.company.id
                          }
                          onClick={() =>
                            executePrimaryPaidAction(
                              filteredPaidPrimaryAction.key,
                              filteredPaidCandidate,
                              latestDemoRequestByCompanyId.get(filteredPaidCandidate.company.id) || null
                            )
                          }
                        >
                          {filteredPaidPrimaryAction.label}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={subscriptionSavingId === filteredPaidCandidate.company.id}
                        onClick={() =>
                          applyOverviewPaidAction(
                            "prepare_manual",
                            filteredPaidCandidate.company,
                            filteredPaidCandidate.subscription,
                            latestDemoRequestByCompanyId.get(filteredPaidCandidate.company.id) || null
                          )
                        }
                      >
                        Manual
                      </button>
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={subscriptionSavingId === filteredPaidCandidate.company.id}
                        onClick={() =>
                          applyOverviewPaidAction(
                            "invoice_sent",
                            filteredPaidCandidate.company,
                            filteredPaidCandidate.subscription,
                            latestDemoRequestByCompanyId.get(filteredPaidCandidate.company.id) || null
                          )
                        }
                      >
                        Sent
                      </button>
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() =>
                          copyOverviewBillingPack(
                            filteredPaidCandidate.company,
                            filteredPaidCandidate.subscription,
                            latestDemoRequestByCompanyId.get(filteredPaidCandidate.company.id) || null,
                            filteredPaidCandidate.nextStep
                          )
                        }
                      >
                        Pack
                      </button>
                      {(filteredPaidCandidate.readyPackEligible || filteredPaidCandidate.goLive.readiness === "almost_ready") ? (
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={launchBundleSavingId === filteredPaidCandidate.company.id || starterAccessCreatingId === filteredPaidCandidate.company.id}
                          onClick={() =>
                            onApplyPlatformFullLaunchBundle?.(
                              filteredPaidCandidate.company.id,
                              getOverviewLaunchOptions(
                                filteredPaidCandidate.company,
                                filteredPaidCandidate.subscription,
                                latestDemoRequestByCompanyId.get(filteredPaidCandidate.company.id) || null
                              )
                            )
                          }
                        >
                          Ready pack
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ) : null}
            </>
          ) : null}

          {false && companyMode === "billing" ? (
            <>
              <div className="platform-company-mode-bar platform-company-subfilters">
                <button type="button" className={`tab-button ${billingFilter === "all" ? "active" : ""}`} onClick={() => setBillingFilter("all")}>
                  Все
                </button>
                <button type="button" className={`tab-button ${billingFilter === "past_due" ? "active" : ""}`} onClick={() => setBillingFilter("past_due")}>
                  Past due
                </button>
                <button type="button" className={`tab-button ${billingFilter === "trial" ? "active" : ""}`} onClick={() => setBillingFilter("trial")}>
                  Trial
                </button>
                <button type="button" className={`tab-button ${billingFilter === "paused" ? "active" : ""}`} onClick={() => setBillingFilter("paused")}>
                  Paused
                </button>
                <button type="button" className={`tab-button ${billingFilter === "manual" ? "active" : ""}`} onClick={() => setBillingFilter("manual")}>
                  Manual
                </button>
                <button type="button" className={`tab-button ${billingFilter === "renewal" ? "active" : ""}`} onClick={() => setBillingFilter("renewal")}>
                  Renewal
                </button>
              </div>
              <div className="crm-summary-bar platform-company-summary-bar">
                <span>{billingControlSummary.total} компаний в billing-срезе</span>
                <span>{billingControlSummary.pastDue} past due</span>
                <span>{billingControlSummary.trial} trial</span>
                <span>{billingControlSummary.paused} paused</span>
                <span>{billingControlSummary.renewal} renewal window</span>
              </div>
            </>
          ) : null}

          {false && companyMode === "qa" ? (
            <>
              <div className="platform-company-mode-bar platform-company-subfilters">
                <button type="button" className={`tab-button ${qaFilter === "all" ? "active" : ""}`} onClick={() => setQaFilter("all")}>
                  Все
                </button>
                <button type="button" className={`tab-button ${qaFilter === "critical" ? "active" : ""}`} onClick={() => setQaFilter("critical")}>
                  Critical
                </button>
                <button type="button" className={`tab-button ${qaFilter === "warning" ? "active" : ""}`} onClick={() => setQaFilter("warning")}>
                  Warning
                </button>
                <button type="button" className={`tab-button ${qaFilter === "handoff" ? "active" : ""}`} onClick={() => setQaFilter("handoff")}>
                  Handoff
                </button>
                <button type="button" className={`tab-button ${qaFilter === "owner" ? "active" : ""}`} onClick={() => setQaFilter("owner")}>
                  Owner
                </button>
                <button type="button" className={`tab-button ${qaFilter === "services" ? "active" : ""}`} onClick={() => setQaFilter("services")}>
                  Services
                </button>
                <button type="button" className={`tab-button ${qaFilter === "billing" ? "active" : ""}`} onClick={() => setQaFilter("billing")}>
                  Billing
                </button>
              </div>
              <div className="crm-summary-bar platform-company-summary-bar">
                <span>{filteredQaSummary.total} компаний в QA-срезе</span>
                <span>{filteredQaSummary.critical} critical</span>
                <span>{filteredQaSummary.warning} warning</span>
                <span>{filteredQaSummary.handoff} с открытым handoff</span>
                <span>{filteredQaSummary.owner} с owner-проблемой</span>
              </div>
            </>
          ) : null}

          <div className="platform-company-legend">
            {companyStatusSummary.map((item) => (
              <div key={item.key} className={`platform-company-legend-item status-${item.key}`}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>

          {focusedCompany ? (
            <PlatformCompanyPreview
              company={focusedCompany}
              subscription={focusedCompanySubscription}
              linkedDemoRequest={latestDemoRequestByCompanyId.get(focusedCompany.id) || null}
              canOpenCrm={accessibleCompanyIds.has(focusedCompany.id)}
              onOpenCompany={onOpenCompany}
              onOpenDemoRequest={openDemoRequestById}
            />
          ) : null}

          <div className="platform-company-list">
            {companiesPanelRows.map((company) => {
              const subscription = subscriptionsByCompanyId.get(company.id) || null;
              const linkedDemoRequest = latestDemoRequestByCompanyId.get(company.id) || null;
              const handoffActivation = linkedDemoRequest
                ? getDemoRequestActivationState(linkedDemoRequest, companiesById, subscriptionsByCompanyId)
                : null;
              const planCode = subscription?.plan_code || company.plan_code || "starter";
              const seatLimit = planSeatLimits[planCode];
              const activeMembersCount = Number(company.active_members_count || 0);
              const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
              const renewDaysLeft = getDaysUntil(subscription?.renews_at);
              const reasons = [];
              const qaRecord = multiCompanyQaRows.find((item) => item.company.id === company.id) || null;
              const launchRecord = paidOnboardingRows.find((item) => item.company.id === company.id) || null;
              const launchLane = launchPipelineRows.find((item) => item.company.id === company.id)?.lane || null;
              const controlState = creatorControlRows.find((item) => item.company.id === company.id)?.control || null;
              const hasCompanyInactive = launchRecord?.blockers?.some((blocker) => blocker.sourceKey === "company_status");
              const hasTeamMissing = launchRecord?.blockers?.some((blocker) => blocker.sourceKey === "members");
              const billingOnly = Boolean(launchRecord) && launchRecord.blockers.length === 1 && launchRecord.blockers[0]?.sourceKey === "billing";
              const showReadyPack = Boolean(launchRecord) && (launchRecord.readyPackEligible || launchRecord.goLive.readiness === "almost_ready");
              const paidOrder = paidOrderByCompanyId.get(company.id) || null;
              const primaryPaidAction = companyMode === "paid" && launchRecord ? getPrimaryPaidActionConfig(launchRecord) : null;

              if (subscription?.billing_status === "past_due") reasons.push("Просрочка");
              if (subscription?.billing_status === "paused") reasons.push("Пауза");
              if (subscription?.billing_status === "trial" && trialDaysLeft != null && trialDaysLeft <= 7) reasons.push("Триал");
              if (subscription?.billing_status === "active" && renewDaysLeft != null && renewDaysLeft <= 14) reasons.push("Renewal");
              if (seatLimit != null && activeMembersCount >= seatLimit) reasons.push("Лимит");
              if (!company.owner_email) reasons.push("Контакт");
              if (linkedDemoRequest) reasons.push("Handoff");
              if (handoffActivation?.stage === "no_subscription") reasons.push("Нет подписки");
              if (handoffActivation?.stage === "plan_mismatch") reasons.push("Тариф мимо");
              if (handoffActivation?.stage === "company_inactive") reasons.push("Не активна");
              if (qaRecord?.severity === "critical") reasons.push("QA critical");
              if (launchLane) reasons.push(launchLane.title);
              if (launchRecord?.paidReady) reasons.push("Ready to pay");
              if (launchRecord && !launchRecord.paidReady && launchRecord.goLive.readiness === "almost_ready") reasons.push("Почти ready");

              if (focusedCompany?.id === company.id) {
                return null;
              }

              return (
                <article key={company.id} className={`platform-company-list-row status-${company.status} ${focusedCompany?.id === company.id ? "active" : ""}`}>
                  <div className="platform-company-list-main">
                    <div className="platform-company-list-title">
                      {companyMode === "paid" && paidOrder ? <span className="platform-company-priority-badge">#{paidOrder}</span> : null}
                      <strong>{company.name}</strong>
                      {company.is_demo ? <span className="platform-status-chip status-demo">Demo</span> : <span className="platform-status-chip status-live">Live</span>}
                      <span className={`platform-status-chip status-${company.status}`}>{formatCompanyStatus(company.status)}</span>
                      {controlState ? <span className={`platform-status-chip control-${controlState.bucket}`}>{controlState.title}</span> : null}
                      {launchLane ? <span className={`platform-status-chip lane-${launchLane.accent}`}>{launchLane.title}</span> : null}
                      {qaRecord?.issues.length ? (
                        <span className={`platform-status-chip ${qaRecord.severity === "critical" ? "lane-billing" : "lane-owner"}`}>
                          {qaRecord.severity === "critical" ? "QA critical" : "QA warning"}
                        </span>
                      ) : null}
                      {handoffActivation ? (
                        <span className={`platform-status-chip activation-stage-chip stage-${handoffActivation.stage}`}>
                          {formatActivationStage(handoffActivation.stage)}
                        </span>
                      ) : null}
                    </div>
                    <span>
                      {businessTypeLabels[company.business_type] || "Автосервис"} · {planLabels[planCode] || planCode} ·{" "}
                      {formatBillingStatus(subscription?.billing_status || "trial")}
                    </span>
                    {controlState ? <span className="platform-company-control-note">Следующий шаг: {controlState.nextStep}</span> : null}
                    {launchLane ? <span className="platform-company-control-note">Launch: {launchLane.note}</span> : null}
                    {companyMode === "paid" && launchRecord ? <span className="platform-company-control-note">Paid close: {launchRecord.nextStep}</span> : null}
                    {qaRecord?.issues.length ? <span className="platform-company-control-note">QA: {qaRecord.issues[0]}</span> : null}
                    {linkedDemoRequest ? (
                      <span className="platform-company-handoff-note">
                        Витрина: {formatStorefrontPlanLabel(getDemoRequestCommerceSnapshot(linkedDemoRequest).plan)} ·{" "}
                        {formatDemoBillingPeriod(getDemoRequestCommerceSnapshot(linkedDemoRequest).billing)}
                      </span>
                    ) : null}
                  </div>
                  <div className="platform-company-list-meta">
                    <span>{activeMembersCount} сотрудников</span>
                    <span>{company.clients_count || 0} клиентов</span>
                    <span>{company.open_leads_count || 0} открытых заявок</span>
                    <span>{company.owner_email || company.contact_email || "Без контакта"}</span>
                  </div>
                  {companyMode === "paid" && launchRecord ? (
                    <div className="platform-company-list-signals platform-company-list-paid-signals">
                      <span>Очередь #{paidOrderByCompanyId.get(company.id) || "—"}</span>
                      <span className={`platform-commercial-stage tone-${getCommercialCloseStageTone(launchRecord.commercialStage)}`}>
                        {formatCommercialCloseStage(launchRecord.commercialStage)}
                      </span>
                      <span className={`platform-status-chip status-${launchRecord.goLive.readiness === "almost_ready" ? "paused" : launchRecord.goLive.readiness === "blocked" ? "archived" : "active"}`}>
                        {launchRecord.goLive.readiness === "almost_ready" ? "Почти ready" : launchRecord.goLive.readiness === "blocked" ? "Blocked" : "Ready"}
                      </span>
                    </div>
                  ) : null}
                  <div className="platform-company-list-signals">
                    {reasons.length ? reasons.map((reason) => <span key={reason}>{reason}</span>) : <span>OK</span>}
                  </div>
                  <div className="platform-company-list-actions">
                    {companyMode === "paid" && launchRecord ? (
                      <>
                        {primaryPaidAction ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={
                              subscriptionSavingId === company.id ||
                              launchBundleSavingId === company.id ||
                              starterAccessCreatingId === company.id ||
                              companyPackApplyingId === company.id
                            }
                            onClick={() => executePrimaryPaidAction(primaryPaidAction.key, launchRecord, linkedDemoRequest)}
                          >
                            {primaryPaidAction.label}
                          </button>
                        ) : null}
                        {hasCompanyInactive ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={subscriptionSavingId === company.id}
                            onClick={() => applyOverviewStatusAction("active", company, subscription, linkedDemoRequest)}
                          >
                            Active
                          </button>
                        ) : null}
                        {hasTeamMissing ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={starterAccessCreatingId === company.id}
                            onClick={() => onCreatePlatformStarterBundle?.(company.id)}
                          >
                            Starter
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-outline"
                          disabled={subscriptionSavingId === company.id}
                          onClick={() => applyOverviewPaidAction("prepare_manual", company, subscription, linkedDemoRequest)}
                        >
                          Manual
                        </button>
                        {showReadyPack ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={launchBundleSavingId === company.id || starterAccessCreatingId === company.id}
                            onClick={() =>
                              onApplyPlatformFullLaunchBundle?.(
                                company.id,
                                getOverviewLaunchOptions(company, subscription, linkedDemoRequest)
                              )
                            }
                          >
                            {billingOnly ? "Full manual" : "Ready pack"}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {linkedDemoRequest ? (
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => openDemoRequestById(linkedDemoRequest.id, linkedDemoRequest.status || "all")}
                      >
                        Открыть handoff
                      </button>
                    ) : null}
                    <button type="button" className="button button-outline" onClick={() => setFocusedCompanyId(company.id)}>
                      Открыть управление
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

                </section>
      ) : null}

      {activeView === "subscriptions" ? (
        <section className="surface-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Подписки</span>
              <h2>Текущий SaaS-контур</h2>
            </div>
          </div>

          <div className="platform-subscription-health-grid">
            {subscriptionHealthRows.slice(0, 4).map((item) => (
              <article
                key={item.company.id}
                className={`platform-subscription-health-card ${item.needsAction ? "needs-action" : ""}`}
              >
                <span>{item.company.name}</span>
                <strong>{formatBillingStatus(item.subscription?.billing_status || "trial")}</strong>
                <p>
                  {item.subscription?.billing_status === "trial" && item.trialDaysLeft != null
                    ? item.trialDaysLeft < 0
                      ? "Триал уже завершён"
                      : `До конца триала ${item.trialDaysLeft} дн.`
                    : item.subscription?.billing_status === "active" && item.renewDaysLeft != null
                    ? item.renewDaysLeft < 0
                      ? "Продление просрочено"
                      : `Следующее продление через ${item.renewDaysLeft} дн.`
                    : `${item.activeMembersCount} сотрудников / лимит ${formatSeatLimit(item.planCode)}`}
                </p>
              </article>
            ))}
          </div>

          <div className="platform-subscription-matrix">
            {subscriptionHealthRows.map((item) => (
              <article key={`${item.company.id}-health`} className="platform-subscription-row">
                <div className="platform-subscription-row-main">
                  <strong>{item.company.name}</strong>
                  <span>
                    {planLabels[item.planCode] || item.planCode} · {formatBillingStatus(item.subscription?.billing_status || "trial")}
                  </span>
                </div>
                <div className="platform-subscription-row-meta">
                  <span>{item.activeMembersCount} сотрудников</span>
                  <span>Лимит: {formatSeatLimit(item.planCode)}</span>
                  <span>
                    {item.trialDaysLeft != null
                      ? item.trialDaysLeft < 0
                        ? "Триал истёк"
                        : `Триал: ${item.trialDaysLeft} дн.`
                      : "Триала нет"}
                  </span>
                  <span>
                    {item.renewDaysLeft != null
                      ? item.renewDaysLeft < 0
                        ? "Продление просрочено"
                        : `Renewal: ${item.renewDaysLeft} дн.`
                      : "Renewal не задан"}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="platform-revenue-plan-grid">
            {revenueByPlan.map((item) => (
              <article key={`${item.planCode}-revenue`} className="platform-revenue-plan-card">
                <span>{planLabels[item.planCode] || item.planCode}</span>
                <strong>{platformEurFormatter.format(item.mrr)} EUR</strong>
                <p>{item.companies} компаний на тарифе</p>
                <small>{item.atRisk ? `${platformEurFormatter.format(item.atRisk)} EUR в зоне риска` : "Без выручки под риском"}</small>
              </article>
            ))}
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Компания</th>
                  <th>Владелец</th>
                  <th>Контакты</th>
                  <th>Статус</th>
                  <th>Тариф</th>
                  <th>Статус биллинга</th>
                  <th>Использование</th>
                  <th>Цена / месяц</th>
                  <th>Подключена</th>
                  <th>Старт</th>
                  <th>Триал до</th>
                  <th>Продление</th>
                  <th>Окончание</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => {
                  const subscription = subscriptionsByCompanyId.get(company.id);

                  return (
                    <tr key={`${company.id}-subscription`}>
                      <td>{company.name}</td>
                      <td>
                        <div className="platform-table-stack">
                          <strong>{company.owner_name || "Не назначен"}</strong>
                          <span>{company.owner_email || "Без почты"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="platform-table-stack">
                          <strong>{company.contact_phone || "Без телефона"}</strong>
                          <span>{company.contact_email || "Без почты"}</span>
                        </div>
                      </td>
                      <td>{formatCompanyStatus(company.status)}</td>
                      <td>{planLabels[subscription?.plan_code || company.plan_code] || subscription?.plan_code || company.plan_code || "Старт"}</td>
                      <td>{formatBillingStatus(subscription?.billing_status)}</td>
                      <td>
                        <div className="platform-table-stack">
                          <strong>{company.active_members_count || 0} сотрудников</strong>
                          <span>
                            {company.clients_count || 0} клиентов / {company.leads_count || 0} заявок / лимит {formatSeatLimit(subscription?.plan_code || company.plan_code || "starter")}
                          </span>
                        </div>
                      </td>
                      <td>{subscription?.price_monthly ? `${Number(subscription.price_monthly)} EUR` : "Не задана"}</td>
                      <td>{formatDate(company.owner_connected_at || company.created_at)}</td>
                      <td>{subscription?.starts_at ? formatDate(subscription.starts_at) : "—"}</td>
                      <td>{subscription?.trial_ends_at ? formatDate(subscription.trial_ends_at) : "—"}</td>
                      <td>{subscription?.renews_at ? formatDate(subscription.renews_at) : "—"}</td>
                      <td>{subscription?.ends_at ? formatDate(subscription.ends_at) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="platform-history-block">
            <div className="section-title">
              <div>
                <span className="eyebrow">История</span>
                <h2>Последние изменения по подпискам</h2>
              </div>
            </div>

            <div className="platform-history-list">
              {recentSubscriptionEvents.length ? (
                recentSubscriptionEvents.map((event) => {
                  const company = companies.find((item) => item.id === event.company_id);
                  return (
                    <article key={event.id} className="platform-history-item">
                      <div className="platform-history-head">
                        <strong>{company?.name || "Компания"}</strong>
                        <span>{formatDateTime(event.created_at)}</span>
                      </div>
                      <div className="platform-history-meta">
                        <span>{formatSubscriptionEventType(event.event_type)}</span>
                        <span>{event.payload?.plan_code ? `Тариф: ${planLabels[event.payload.plan_code] || event.payload.plan_code}` : null}</span>
                        <span>{event.payload?.billing_status ? `Биллинг: ${formatBillingStatus(event.payload.billing_status)}` : null}</span>
                      </div>
                      <p>{event.note || "Изменение без текстовой заметки."}</p>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">История изменений пока пустая.</div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeView === "demo" ? (
        <section className="surface-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Лиды с витрины</span>
              <h2>Управление демо-заявками</h2>
            </div>
            <div className="section-title-aux">
              <span>{filteredDemoRequests.length} в выдаче</span>
            </div>
          </div>

          <div className="metrics-grid platform-demo-metrics">
            <MetricCard icon="DZ" label="Всего запросов" value={demoRequestSummary.total} accent />
            <MetricCard icon="RL" label="Реальные" value={demoRequestSummary.realCount} variant="success" />
            <MetricCard icon="QA" label="QA" value={demoRequestSummary.qaCount} variant="info" />
            <MetricCard icon="NW" label="Новые" value={demoRequestSummary.newCount} />
            <MetricCard icon="CB" label="Связались" value={demoRequestSummary.contactedCount} />
            <MetricCard icon="QL" label="Квалифицированы" value={demoRequestSummary.qualifiedCount} />
            <MetricCard icon="ON" label="Подключены" value={demoRequestSummary.connectedCount} />
          </div>

          <div className="platform-demo-priority-grid">
            <article className="platform-demo-priority-card">
              <span>Тёплые заявки</span>
              <strong>{demoConversionQueue.length}</strong>
              <p>Контакты, по которым уже есть смысл быстро переводить разговор в подключение.</p>
            </article>
            <article className="platform-demo-priority-card">
              <span>Ручные real leads</span>
              <strong>{manualRealDemoRequests.length}</strong>
              <p>Owner-ы, которых creator завёл сам и может сразу доводить до company / billing flow.</p>
            </article>
            <article className="platform-demo-priority-card">
              <span>Привязано к компаниям</span>
              <strong>{demoLinkedCompaniesCount}</strong>
              <p>Сколько заявок уже связаны с карточкой компании и могут пойти в реальный запуск.</p>
            </article>
            <article className="platform-demo-priority-card">
              <span>Storefront real leads</span>
              <strong>{storefrontRealDemoRequests.length}</strong>
              <p>Живые входящие с витрины, которые не надо смешивать с ручными и QA сценариями.</p>
            </article>
          </div>

          {demoActivationQueue.length ? (
            <div className="platform-activation-queue">
              <div className="section-title compact">
                <div>
                  <span className="eyebrow">Activation queue</span>
                  <h2>Что переводить в подключение прямо сейчас</h2>
                </div>
              </div>
              <div className="platform-activation-grid">
                {demoActivationQueue.map((item) => (
                  <article key={`activation-${item.request.id}`} className="platform-activation-card">
                    <div className="platform-activation-head">
                      <div>
                        <strong>{item.request.company_name || item.request.name}</strong>
                        <span>
                          {formatStorefrontPlanLabel(getDemoRequestCommerceSnapshot(item.request).plan)} · {item.billingPeriod}
                        </span>
                      </div>
                      <span className={`platform-status-chip demo-status-chip status-${item.request.status || "new"}`}>
                        {formatDemoRequestStatus(item.request.status)}
                      </span>
                    </div>
                    <div className="platform-activation-meta">
                      <span>{item.linkedCompany ? item.linkedCompany.name : "Компания ещё не связана"}</span>
                      <span>{item.linkedSubscription ? formatBillingStatus(item.linkedSubscription.billing_status) : "Подписки ещё нет"}</span>
                    </div>
                    <div className="platform-activation-step">
                      <span>Следующий шаг</span>
                      <strong>{item.nextStep}</strong>
                    </div>
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => {
                        setDemoStatusFilter(item.request.status || "new");
                        const element = document.getElementById(`platform-demo-request-${item.request.id}`);
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                    >
                      Открыть handoff
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {demoConversionQueue.length ? (
            <div className="platform-demo-priority-list">
              {demoConversionQueue.map((request) => (
                <article key={`priority-${request.id}`} className="platform-demo-priority-item">
                  <div>
                    <strong>{request.name}</strong>
                    <span>
                      {request.company_name || "Компания не указана"} · {formatDemoRequestStatus(request.status)}
                    </span>
                    {getDemoRequestCommerceSnapshot(request).plan ? (
                      <span>
                        {getDemoRequestCommerceSnapshot(request).plan}
                        {getDemoRequestCommerceSnapshot(request).billing ? ` · ${getDemoRequestCommerceSnapshot(request).billing}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <div className="platform-demo-priority-meta">
                    <span>{request.phone}</span>
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => {
                        setDemoStatusFilter(request.status || "new");
                        const element = document.getElementById(`platform-demo-request-${request.id}`);
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                    >
                      Открыть заявку
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="platform-demo-toolbar">
            <div className="platform-demo-activation-filters">
              <button
                type="button"
                className={`tab-button ${demoActivationFilter === "all" ? "active" : ""}`}
                onClick={() => setDemoActivationFilter("all")}
              >
                Все
              </button>
              <button
                type="button"
                className={`tab-button ${demoActivationFilter === "activation" ? "active" : ""}`}
                onClick={() => setDemoActivationFilter("activation")}
              >
                Нужна активация
              </button>
              <button
                type="button"
                className={`tab-button ${demoActivationFilter === "unlinked" ? "active" : ""}`}
                onClick={() => setDemoActivationFilter("unlinked")}
              >
                Без компании
              </button>
              <button
                type="button"
                className={`tab-button ${demoActivationFilter === "no_subscription" ? "active" : ""}`}
                onClick={() => setDemoActivationFilter("no_subscription")}
              >
                Без подписки
              </button>
              <button
                type="button"
                className={`tab-button ${demoActivationFilter === "plan_mismatch" ? "active" : ""}`}
                onClick={() => setDemoActivationFilter("plan_mismatch")}
              >
                Мимо тарифа
              </button>
              <button
                type="button"
                className={`tab-button ${demoActivationFilter === "company_inactive" ? "active" : ""}`}
                onClick={() => setDemoActivationFilter("company_inactive")}
              >
                Не активна
              </button>
            </div>
            <div className="crm-summary-bar platform-demo-summary-bar">
              <span>{demoActivationSummary.activationNeeded} требуют активации</span>
              <span>{demoActivationSummary.unlinked} без компании</span>
              <span>{demoActivationSummary.noSubscription} без подписки</span>
              <span>{demoActivationSummary.planMismatch} с расхождением тарифа</span>
              <span>{demoActivationSummary.companyInactive} company не active</span>
            </div>
            <select
              className="search-input platform-filter-select"
              value={demoAudienceFilter}
              onChange={(event) => setDemoAudienceFilter(event.target.value)}
            >
              <option value="real">Только реальные</option>
              <option value="qa">Только QA</option>
              <option value="all">Все заявки</option>
            </select>
            <select
              className="search-input platform-filter-select"
              value={demoSourceFilter}
              onChange={(event) => setDemoSourceFilter(event.target.value)}
            >
              <option value="all">Все источники</option>
              <option value="manual">Только manual</option>
              <option value="storefront">Только storefront</option>
            </select>
            <select
              className="search-input platform-filter-select"
              value={demoStatusFilter}
              onChange={(event) => setDemoStatusFilter(event.target.value)}
            >
              <option value="all">Все статусы</option>
              {demoRequestStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatDemoRequestStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="platform-demo-board">
            {demoRequestStatusOptions.map((status) => (
              <article key={status} className={`platform-demo-column status-${status}`}>
                <div className="platform-demo-column-head">
                  <strong>{formatDemoRequestStatus(status)}</strong>
                  <span>{demoRequestsByStatus[status]?.length || 0}</span>
                </div>
                <div className="platform-demo-column-body">
                  {(demoRequestsByStatus[status] || []).slice(0, 4).map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      className="platform-demo-mini-card"
                      onClick={() => {
                        setDemoStatusFilter(status);
                        const element = document.getElementById(`platform-demo-request-${request.id}`);
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                    >
                      <strong>{request.name}</strong>
                      <span>{request.phone}</span>
                    </button>
                  ))}
                  {(demoRequestsByStatus[status]?.length || 0) === 0 ? (
                    <div className="platform-demo-mini-empty">Нет заявок</div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {filteredDemoRequests.length ? (
            <div className="platform-demo-grid">
              {filteredDemoRequests.map((request) => (
                <PlatformDemoRequestCard
                  key={request.id}
                  request={request}
                  companies={companies}
                  subscriptionsByCompanyId={subscriptionsByCompanyId}
                  subscriptionEvents={request.connected_company_id ? subscriptionEventsByCompanyId.get(request.connected_company_id) || [] : []}
                  saving={demoRequestSavingId === request.id}
                  onUpdateStatus={onUpdateDemoRequestStatus}
                  onCreateCompanyFromRequest={onCreateCompanyFromDemoRequest}
                  onRunPaidAction={(type, company, subscription, linkedRequest) =>
                    type === "active"
                      ? applyOverviewStatusAction("active", company, subscription, linkedRequest)
                      : applyOverviewPaidAction(type, company, subscription, linkedRequest)
                  }
                  onCopyBillingPack={copyOverviewBillingPack}
                  onCopyOwnerBillingPack={copyOverviewOwnerBillingPack}
                  onFocusCompany={(companyId) => {
                    const company = companies.find((item) => item.id === companyId);
                    setActiveView("companies");
                    setCompanyMode("handoff");
                    setFocusedCompanyId(companyId);
                    if (company?.name) {
                      setSearch(company.name);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">Пока нет демо-заявок в этом статусе.</div>
          )}
        </section>
      ) : null}
    </section>
  );
}

function PlatformDemoRequestCard({
  request,
  companies = [],
  subscriptionsByCompanyId,
  subscriptionEvents = [],
  saving = false,
  onUpdateStatus,
  onCreateCompanyFromRequest,
  onRunPaidAction,
  onCopyBillingPack,
  onCopyOwnerBillingPack,
  onFocusCompany
}) {
  const [statusInput, setStatusInput] = useState(request.status || "new");
  const [companyIdInput, setCompanyIdInput] = useState(request.connected_company_id || "");
  const [followUpInput, setFollowUpInput] = useState(formatDateTimeLocal(getDemoRequestCreatorFollowUpAt(request)));
  const [creatorNoteInput, setCreatorNoteInput] = useState(getDemoRequestCreatorNote(request));

  useEffect(() => {
    setStatusInput(request.status || "new");
  }, [request.status]);

  useEffect(() => {
    setCompanyIdInput(request.connected_company_id || "");
  }, [request.connected_company_id]);

  useEffect(() => {
    setFollowUpInput(formatDateTimeLocal(getDemoRequestCreatorFollowUpAt(request)));
    setCreatorNoteInput(getDemoRequestCreatorNote(request));
  }, [request]);

  async function applyQuickStatus(nextStatus) {
    setStatusInput(nextStatus);
    await onUpdateStatus(request.id, {
      status: nextStatus,
      connected_company_id: companyIdInput || null,
      meta_patch: {
        creator_follow_up_at: followUpInput || null,
        creator_note: creatorNoteInput.trim()
      }
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const initialFollowUp = formatDateTimeLocal(getDemoRequestCreatorFollowUpAt(request));
    const initialCreatorNote = getDemoRequestCreatorNote(request);

    if (
      statusInput === request.status &&
      companyIdInput === (request.connected_company_id || "") &&
      followUpInput === initialFollowUp &&
      creatorNoteInput.trim() === initialCreatorNote
    ) {
      return;
    }

    await onUpdateStatus(request.id, {
      status: statusInput,
      connected_company_id: companyIdInput || null,
      meta_patch: {
        creator_follow_up_at: followUpInput || null,
        creator_note: creatorNoteInput.trim()
      }
    });
  }

  const connectedCompany = companies.find((company) => company.id === request.connected_company_id) || null;
  const activationState = getDemoRequestActivationState(
    request,
    new Map(companies.map((company) => [company.id, company])),
    subscriptionsByCompanyId || new Map()
  );
  const linkedSubscription = activationState.linkedSubscription;
  const commerceSnapshot = activationState.commerce;
  const storefrontPlan = formatStorefrontPlanLabel(commerceSnapshot.plan);
  const suggestedCompanyPlanLabel = activationState.suggestedPlanCode
    ? planLabels[activationState.suggestedPlanCode] || activationState.suggestedPlanCode
    : "Нужно решить вручную";
  const billingPeriodLabel = activationState.billingPeriodLabel;
  const activationNextStep = activationState.nextStep;
  const activationChecklist = getActivationChecklistItems(activationState);
  const commercialStage = linkedSubscription ? getCommercialCloseStage(linkedSubscription, subscriptionEvents) : "not_started";
  const commercialStageTone = getCommercialCloseStageTone(commercialStage);
  const goLiveChecklist = connectedCompany ? getCompanyGoLiveChecklist(connectedCompany, linkedSubscription, activationState) : null;
  const paidReadiness = connectedCompany
    ? getPaidReadinessRecord({ company: connectedCompany, subscription: linkedSubscription, activation: activationState })
    : null;
  const lifecycleFacts = [
    { label: "Создана", value: request.created_at },
    { label: "Связались", value: request.contacted_at },
    { label: "Квалификация", value: request.qualified_at },
    { label: "Подключена", value: request.connected_at }
  ].filter((item) => item.value);
  const followUpState = getDemoRequestFollowUpState(request);
  const creatorFollowUpAt = getDemoRequestCreatorFollowUpAt(request);
  const creatorNote = getDemoRequestCreatorNote(request);

  return (
    <article id={`platform-demo-request-${request.id}`} className="platform-demo-card">
      <div className="platform-demo-head">
        <div>
          <strong>{request.name}</strong>
          <span>{formatDateTime(request.created_at)}</span>
        </div>
        <div className="platform-demo-head-chips">
          <span className={`platform-status-chip ${isQaDemoRequest(request) ? "status-demo" : "status-live"}`}>
            {isQaDemoRequest(request) ? "QA" : "Real"}
          </span>
          <span className={`platform-status-chip activation-stage-chip stage-${activationState.stage}`}>
            {formatActivationStage(activationState.stage)}
          </span>
          <span className={`platform-status-chip demo-status-chip status-${request.status || "new"}`}>{formatDemoRequestStatus(request.status)}</span>
        </div>
      </div>

      <div className="platform-demo-meta">
        <span>{request.phone}</span>
        <span>{businessTypeLabels[request.business_type] || request.business_type || "Бизнес не указан"}</span>
        <span>{request.company_name || "Компания не указана"}</span>
        {commerceSnapshot.plan ? <span>Пакет: {commerceSnapshot.plan}</span> : null}
        {commerceSnapshot.billing ? <span>{formatDemoBillingPeriod(commerceSnapshot.billing)}</span> : null}
        {commerceSnapshot.ownerEmail ? <span>{commerceSnapshot.ownerEmail}</span> : null}
      </div>

      {request.comment ? <p className="platform-demo-comment">{request.comment}</p> : null}

      <div className="platform-demo-facts">
        <div>
          <span>Источник</span>
          <strong>{sourceLabels[request.source] || formatLabel(request.source) || "Сайт"}</strong>
        </div>
        <div>
          <span>Пакет с витрины</span>
          <strong>{storefrontPlan}</strong>
        </div>
        <div>
          <span>Для CRM</span>
          <strong>{suggestedCompanyPlanLabel}</strong>
        </div>
        <div>
          <span>Период</span>
          <strong>{billingPeriodLabel}</strong>
        </div>
        <div>
          <span>Сотрудники</span>
          <strong>{request.employees_count ?? "—"}</strong>
        </div>
        <div>
          <span>Локации</span>
          <strong>{commerceSnapshot.locations || request.locations_count || "—"}</strong>
        </div>
        <div>
          <span>Роль</span>
          <strong>{commerceSnapshot.role || "—"}</strong>
        </div>
        <div>
          <span>Пользователи</span>
          <strong>{commerceSnapshot.teamSize || request.employees_count || "—"}</strong>
        </div>
      </div>

      <div className="platform-demo-handoff">
        <div className="platform-demo-handoff-grid">
          <article className="platform-demo-handoff-card">
            <span>Компания</span>
            <strong>{connectedCompany?.name || "Пока не связана"}</strong>
          </article>
          <article className="platform-demo-handoff-card">
            <span>Подписка</span>
            <strong>{linkedSubscription ? formatBillingStatus(linkedSubscription.billing_status) : "Ещё не создана"}</strong>
          </article>
          <article className="platform-demo-handoff-card">
            <span>Тариф CRM</span>
            <strong>{linkedSubscription ? planLabels[linkedSubscription.plan_code] || linkedSubscription.plan_code : suggestedCompanyPlanLabel}</strong>
          </article>
          <article className="platform-demo-handoff-card">
            <span>Следующий шаг</span>
            <strong>{activationNextStep}</strong>
          </article>
          {connectedCompany ? (
            <article className="platform-demo-handoff-card">
              <span>Commercial stage</span>
              <strong>{formatCommercialCloseStage(commercialStage)}</strong>
            </article>
          ) : null}
        </div>
      </div>

      {connectedCompany ? (
        <div className="platform-demo-commercial-strip">
          <article className={`platform-demo-commercial-card tone-${commercialStageTone}`}>
            <span>Биллинг</span>
            <strong>{linkedSubscription ? formatBillingStatus(linkedSubscription.billing_status) : "Ещё не создан"}</strong>
          </article>
          <article className={`platform-demo-commercial-card tone-${commercialStageTone}`}>
            <span>Paid readiness</span>
            <strong>{paidReadiness ? formatGoLiveReadiness(paidReadiness.goLive.readiness) : "Не рассчитано"}</strong>
          </article>
          <article className={`platform-demo-commercial-card tone-${commercialStageTone}`}>
            <span>Что дальше</span>
            <strong>{paidReadiness?.nextStep || goLiveChecklist?.nextStep || activationNextStep}</strong>
          </article>
        </div>
      ) : null}

      <div className="platform-activation-checklist">
        {activationChecklist.map((item) => (
          <article key={`${request.id}-${item.key}`} className={`platform-activation-checklist-item ${item.done ? "done" : "todo"}`}>
            <span>{item.done ? "OK" : "Шаг"}</span>
            <strong>{item.label}</strong>
          </article>
        ))}
      </div>

      {lifecycleFacts.length ? (
        <div className="platform-demo-timeline">
          {lifecycleFacts.map((item) => (
            <div key={item.label} className="platform-demo-timeline-item">
              <span>{item.label}</span>
              <strong>{formatDateTime(item.value)}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div className="platform-demo-handoff">
        <div className="platform-demo-handoff-grid">
          <article className="platform-demo-handoff-card">
            <span>Creator follow-up</span>
            <strong>{creatorFollowUpAt ? formatDateTime(creatorFollowUpAt) : "Не задан"}</strong>
          </article>
          <article className="platform-demo-handoff-card">
            <span>Состояние follow-up</span>
            <strong>{formatDemoRequestFollowUpState(followUpState)}</strong>
          </article>
          <article className="platform-demo-handoff-card">
            <span>Заметка creator</span>
            <strong>{creatorNote || "Пока пусто"}</strong>
          </article>
        </div>
      </div>

      <form className="platform-demo-actions" onSubmit={handleSubmit}>
        <select value={statusInput} onChange={(event) => setStatusInput(event.target.value)} disabled={saving}>
          {demoRequestStatusOptions.map((status) => (
            <option key={status} value={status}>
              {formatDemoRequestStatus(status)}
            </option>
          ))}
        </select>
        <select value={companyIdInput} onChange={(event) => setCompanyIdInput(event.target.value)} disabled={saving}>
          <option value="">Компания не связана</option>
        {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <input type="datetime-local" value={followUpInput} onChange={(event) => setFollowUpInput(event.target.value)} disabled={saving} />
        <input
          type="text"
          value={creatorNoteInput}
          onChange={(event) => setCreatorNoteInput(event.target.value)}
          disabled={saving}
          placeholder="Короткая заметка creator"
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={
            saving ||
            (
              statusInput === request.status &&
              companyIdInput === (request.connected_company_id || "") &&
              followUpInput === formatDateTimeLocal(getDemoRequestCreatorFollowUpAt(request)) &&
              creatorNoteInput.trim() === getDemoRequestCreatorNote(request)
            )
          }
        >
          {saving ? "Сохраняем..." : "Сохранить статус"}
        </button>
      </form>

      <div className="platform-demo-quick-actions">
        <button type="button" className="button button-outline" disabled={saving || statusInput === "contacted"} onClick={() => applyQuickStatus("contacted")}>
          Связались
        </button>
        <button type="button" className="button button-outline" disabled={saving || statusInput === "qualified"} onClick={() => applyQuickStatus("qualified")}>
          Квалифицировать
        </button>
        <button
          type="button"
          className="button button-outline"
          disabled={saving || !companyIdInput || statusInput === "connected"}
          onClick={() => applyQuickStatus("connected")}
        >
          Подключить
        </button>
        {!connectedCompany ? (
          <button
            type="button"
            className="button button-secondary"
            disabled={saving}
            onClick={() => onCreateCompanyFromRequest?.(request.id)}
          >
            Создать компанию + free month
          </button>
        ) : null}
        {connectedCompany && !linkedSubscription ? (
          <button
            type="button"
            className="button button-secondary"
            disabled={saving}
            onClick={() => onRunPaidAction?.("bootstrap_subscription", connectedCompany, linkedSubscription, request)}
          >
            Создать подписку
          </button>
        ) : null}
        {connectedCompany && connectedCompany.status !== "active" ? (
          <button
            type="button"
            className="button button-outline"
            disabled={saving}
            onClick={() => onRunPaidAction?.("active", connectedCompany, linkedSubscription, request)}
          >
            Active
          </button>
        ) : null}
        {connectedCompany ? (
          <button
            type="button"
            className="button button-outline"
            disabled={saving}
            onClick={() => onRunPaidAction?.("prepare_manual", connectedCompany, linkedSubscription, request)}
          >
            Manual
          </button>
        ) : null}
        {connectedCompany ? (
          <button
            type="button"
            className="button button-outline"
            disabled={saving}
            onClick={() => onRunPaidAction?.("invoice_sent", connectedCompany, linkedSubscription, request)}
          >
            Sent
          </button>
        ) : null}
        {connectedCompany ? (
          <button
            type="button"
            className="button button-outline"
            disabled={saving}
            onClick={() => onRunPaidAction?.("confirm_paid", connectedCompany, linkedSubscription, request)}
          >
            Paid
          </button>
        ) : null}
        {connectedCompany ? (
          <button type="button" className="button button-outline" onClick={() => onCopyBillingPack?.(connectedCompany, linkedSubscription, request, paidReadiness?.nextStep || activationNextStep)}>
            Pack
          </button>
        ) : null}
        {connectedCompany ? (
          <button type="button" className="button button-outline" onClick={() => onCopyOwnerBillingPack?.(connectedCompany, linkedSubscription, request, paidReadiness?.nextStep || activationNextStep)}>
            Owner msg
          </button>
        ) : null}
      </div>

      <div className="platform-demo-link-row">
        <span>Связанная компания</span>
        <strong>{connectedCompany?.name || request.company_name || "Пока не привязана"}</strong>
      </div>

      {connectedCompany ? (
        <div className="platform-demo-link-actions">
          <button type="button" className="button button-secondary" onClick={() => onFocusCompany?.(connectedCompany.id)}>
            Открыть в списке компаний
          </button>
        </div>
      ) : null}
    </article>
  );
}

function PlatformCompanyCard({
  company,
  subscription,
  linkedDemoRequest = null,
  linkedDemoActivation = null,
  controlState = null,
  paidQueuePosition = null,
  subscriptionEvents = [],
  accessibleCompanyIds,
  onOpenCompany,
  onFocusCompany,
  onOpenDemoRequest,
  onSaveCompanySubscription,
  onApplyServicePack,
  applyingServicePack = false,
  launchBundleSaving = false,
  onApplyLaunchBundle,
  onApplyFullLaunchBundle,
  starterAccessItems = [],
  starterAccessCreating = false,
  onCreateStarterAccess,
  onCreateStarterBundle,
  saving = false
}) {
  const [statusInput, setStatusInput] = useState(company.status || "active");
  const [planInput, setPlanInput] = useState(subscription?.plan_code || company.plan_code || "starter");
  const [billingStatusInput, setBillingStatusInput] = useState(subscription?.billing_status || "trial");
  const [priceMonthlyInput, setPriceMonthlyInput] = useState(
    subscription?.price_monthly != null && subscription?.price_monthly !== ""
      ? String(Number(subscription.price_monthly))
      : ""
  );
  const [startsAtInput, setStartsAtInput] = useState(formatDateTimeLocal(subscription?.starts_at));
  const [trialEndsAtInput, setTrialEndsAtInput] = useState(formatDateTimeLocal(subscription?.trial_ends_at));
  const [renewsAtInput, setRenewsAtInput] = useState(formatDateTimeLocal(subscription?.renews_at));
  const [endsAtInput, setEndsAtInput] = useState(formatDateTimeLocal(subscription?.ends_at));
  const [notesInput, setNotesInput] = useState(subscription?.notes || "");
  const [copiedLinkType, setCopiedLinkType] = useState("");
  const companyLoginUrl = `/login?company_slug=${encodeURIComponent(company.slug || "")}`;
  const publicRequestUrl = `/request?company_slug=${encodeURIComponent(company.slug || "")}`;
  const publicCompanyUrl = `/s/${encodeURIComponent(company.slug || "")}`;
  const activePlanCode = planInput || company.plan_code || "starter";
  const seatLimit = planSeatLimits[activePlanCode];
  const activeMembersCount = Number(company.active_members_count || 0);
  const activeStaffMembersCount = Number(company.active_staff_members_count || 0);
  const managerMembersCount = Number(company.manager_members_count || 0);
  const detailerMembersCount = Number(company.detailer_members_count || 0);
  const seatOverLimit = seatLimit != null && activeMembersCount > seatLimit;
  const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
  const renewDaysLeft = getDaysUntil(subscription?.renews_at);
  const companyWarnings = [];
  const linkedDemoCommerce = linkedDemoRequest ? getDemoRequestCommerceSnapshot(linkedDemoRequest) : null;
  const recommendedStorefrontPlanId = String(linkedDemoCommerce?.plan || "").trim().toLowerCase();
  const recommendedCompanyPlanCode = storefrontPlanToCompanyPlan[recommendedStorefrontPlanId] || "";
  const recommendedBilling = linkedDemoCommerce?.billing || "monthly";
  const recommendedStorefrontPlan = linkedDemoCommerce ? formatStorefrontPlanLabel(linkedDemoCommerce.plan) : "—";
  const recommendedCompanyPlan = recommendedCompanyPlanCode ? planLabels[recommendedCompanyPlanCode] || recommendedCompanyPlanCode : "—";
  const recommendedBillingLabel = formatDemoBillingPeriod(recommendedBilling);
  const recommendedPlanConfig = recommendedCompanyPlanCode
    ? getStorefrontPlanConfig(recommendedStorefrontPlanId, recommendedBilling)
    : null;
  const recommendedChargeSummary = getCommercialChargeSummary(recommendedPlanConfig, recommendedBilling, subscription?.price_monthly ?? null);
  const activationChecklist = getActivationChecklistItems(linkedDemoActivation);
  const goLiveChecklist = getCompanyGoLiveChecklist(company, subscription, linkedDemoActivation);
  const launchLane = getGoLiveLane(company, subscription, linkedDemoActivation, goLiveChecklist);
  const paidReadiness = getPaidReadinessRecord({ company, subscription, activation: linkedDemoActivation });
  const commercialStage = getCommercialCloseStage(subscription, subscriptionEvents);
  const commercialStageTone = getCommercialCloseStageTone(commercialStage);
  const ownerStep = goLiveChecklist.items.find((item) => item.key === "owner") || null;
  const membersStep = goLiveChecklist.items.find((item) => item.key === "members") || null;
  const servicesStep = goLiveChecklist.items.find((item) => item.key === "services") || null;
  const billingStep = goLiveChecklist.items.find((item) => item.key === "billing") || null;
  const paidBlockers = paidReadiness.blockers || [];
  const primaryPaidAction = getPrimaryPaidActionConfig({
    ...paidReadiness,
    company,
    subscription,
    commercialStage,
    blockers: paidBlockers
  });
  const paidStatusTone =
    paidReadiness.goLive?.readiness === "ready_for_paid"
      ? "active"
      : paidReadiness.goLive?.readiness === "almost_ready"
      ? "paused"
      : "archived";
  const commercialAmount =
    priceMonthlyInput !== "" && !Number.isNaN(Number(priceMonthlyInput))
      ? Number(priceMonthlyInput)
      : Number(subscription?.price_monthly || 0);
  const commercialChargeSummary = getCommercialChargeSummary(recommendedPlanConfig, recommendedBilling, commercialAmount);
  const latestCommercialPayload = getLatestCommercialPayload(subscriptionEvents);
  const [manualPaymentChannelInput, setManualPaymentChannelInput] = useState(latestCommercialPayload.payment_channel || "bank_transfer");
  const [manualPaymentDueAtInput, setManualPaymentDueAtInput] = useState(formatDateTimeLocal(latestCommercialPayload.payment_due_at));
  const [manualPaymentNoteInput, setManualPaymentNoteInput] = useState(latestCommercialPayload.payment_note || "");
  const subscriptionNotes = String(notesInput || subscription?.notes || "");
  const latestManualPreparedEvent = subscriptionEvents.find((event) => event.event_type === "manual_prepared") || null;
  const latestInvoiceSentEvent = subscriptionEvents.find((event) => event.event_type === "invoice_sent") || null;
  const latestPaymentConfirmedEvent = subscriptionEvents.find((event) => event.event_type === "payment_confirmed") || null;
  const manualBillingPrepared =
    billingStatusInput === "manual" ||
    subscriptionNotes.includes("manual billing prepared") ||
    Boolean(latestManualPreparedEvent);
  const manualBillingInvoiceSent =
    subscriptionNotes.includes("invoice sent to owner") ||
    Boolean(latestInvoiceSentEvent);
  const manualBillingPaid =
    billingStatusInput === "active" ||
    subscriptionNotes.includes("first payment confirmed") ||
    Boolean(latestPaymentConfirmedEvent);
  const manualBillingReady =
    statusInput === "active" &&
    billingStatusInput === "manual" &&
    Boolean(company.owner_connected_at) &&
    activeStaffMembersCount > 0 &&
    Number(company.services_count || 0) > 0;

  if (seatOverLimit) {
    companyWarnings.push(`Лимит превышен: ${activeMembersCount}/${seatLimit} сотрудников`);
  }
  if (billingStatusInput === "past_due") {
    companyWarnings.push("Есть просрочка по оплате");
  }
  if (billingStatusInput === "paused") {
    companyWarnings.push("Подписка на паузе");
  }
  if (billingStatusInput === "trial" && trialDaysLeft != null && trialDaysLeft <= 7) {
    companyWarnings.push(
      trialDaysLeft < 0
        ? "Триал уже закончился"
        : trialDaysLeft === 0
        ? "Триал заканчивается сегодня"
        : `Триал закончится через ${trialDaysLeft} дн.`
    );
  }
  if (!company.owner_email) {
    companyWarnings.push("Не указана почта владельца");
  }

  const commercialContext = {
    storefrontPlanId: recommendedStorefrontPlanId,
    billingPeriod: recommendedBilling,
    billingLabel: recommendedBillingLabel,
    planLabel: planLabels[planInput] || planInput || "Старт",
    businessLabel: businessTypeLabels[company.business_type] || "Автосервис",
    billingStatusLabel: formatBillingStatus(billingStatusInput || subscription?.billing_status || "trial"),
    chargeAmount: commercialChargeSummary.chargeAmount,
    chargeSuffix: commercialChargeSummary.chargeSuffix,
    monthlyEquivalent: commercialChargeSummary.monthlyEquivalent,
    ownerName: latestCommercialPayload.owner_name || company.owner_name || linkedDemoRequest?.name || "",
    ownerPhone: latestCommercialPayload.owner_phone || company.contact_phone || linkedDemoRequest?.phone || "",
    ownerEmail: latestCommercialPayload.owner_email || company.owner_email || company.contact_email || "",
    paymentChannel: manualPaymentChannelInput || latestCommercialPayload.payment_channel || "bank_transfer",
    paymentDueAt: manualPaymentDueAtInput || latestCommercialPayload.payment_due_at || "",
    paymentNote: manualPaymentNoteInput.trim(),
    requestId: linkedDemoRequest?.id || latestCommercialPayload.source_request_id || null,
    companyName: company.name,
    companyLoginUrl,
    publicRequestUrl,
    publicCompanyUrl,
    nextStep: paidReadiness.nextStep
  };

  useEffect(() => {
    setStatusInput(company.status || "active");
    setPlanInput(subscription?.plan_code || company.plan_code || "starter");
    setBillingStatusInput(subscription?.billing_status || "trial");
    setPriceMonthlyInput(
      subscription?.price_monthly != null && subscription?.price_monthly !== ""
        ? String(Number(subscription.price_monthly))
        : ""
    );
    setStartsAtInput(formatDateTimeLocal(subscription?.starts_at));
    setTrialEndsAtInput(formatDateTimeLocal(subscription?.trial_ends_at));
    setRenewsAtInput(formatDateTimeLocal(subscription?.renews_at));
    setEndsAtInput(formatDateTimeLocal(subscription?.ends_at));
    setNotesInput(subscription?.notes || "");
    setManualPaymentChannelInput(latestCommercialPayload.payment_channel || "bank_transfer");
    setManualPaymentDueAtInput(formatDateTimeLocal(latestCommercialPayload.payment_due_at));
    setManualPaymentNoteInput(latestCommercialPayload.payment_note || "");
  }, [
    company.status,
    company.plan_code,
    latestCommercialPayload.payment_channel,
    latestCommercialPayload.payment_due_at,
    latestCommercialPayload.payment_note,
    subscription
  ]);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSaveCompanySubscription?.(company.id, {
      status: statusInput,
      plan_code: planInput,
      billing_status: billingStatusInput,
      price_monthly: priceMonthlyInput === "" ? null : Number(priceMonthlyInput),
      starts_at: startsAtInput || null,
      trial_ends_at: trialEndsAtInput || null,
      renews_at: renewsAtInput || null,
      ends_at: endsAtInput || null,
      notes: notesInput.trim() || null,
      event_payload_extra: buildCommercialEventPayloadExtra(commercialContext)
    });
  }

  async function applyQuickStatus(nextStatus) {
    setStatusInput(nextStatus);
    await onSaveCompanySubscription?.(company.id, {
      status: nextStatus,
      plan_code: planInput,
      billing_status: billingStatusInput,
      price_monthly: priceMonthlyInput === "" ? null : Number(priceMonthlyInput),
      starts_at: startsAtInput || null,
      trial_ends_at: trialEndsAtInput || null,
      renews_at: renewsAtInput || null,
      ends_at: endsAtInput || null,
      notes: notesInput.trim() || null,
      event_payload_extra: buildCommercialEventPayloadExtra(commercialContext)
    });
  }

  async function applyQuickBilling(nextBillingStatus) {
    setBillingStatusInput(nextBillingStatus);
    await onSaveCompanySubscription?.(company.id, {
      status: statusInput,
      plan_code: planInput,
      billing_status: nextBillingStatus,
      price_monthly: priceMonthlyInput === "" ? null : Number(priceMonthlyInput),
      starts_at: startsAtInput || null,
      trial_ends_at: trialEndsAtInput || null,
      renews_at: renewsAtInput || null,
      ends_at: endsAtInput || null,
      notes: notesInput.trim() || null,
      event_payload_extra: buildCommercialEventPayloadExtra(commercialContext)
    });
  }

  async function applyBillingScenario(type) {
    const now = new Date();
    const nextTrial = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const nextRenewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const nextEnd = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

    const payload = {
      status: statusInput,
      plan_code: planInput,
      billing_status: billingStatusInput,
      price_monthly: priceMonthlyInput === "" ? null : Number(priceMonthlyInput),
      starts_at: startsAtInput || null,
      trial_ends_at: trialEndsAtInput || null,
      renews_at: renewsAtInput || null,
      ends_at: endsAtInput || null,
      notes: notesInput.trim() || null,
      event_payload_extra: buildCommercialEventPayloadExtra(commercialContext)
    };

    if (type === "extend_trial") {
      payload.billing_status = "trial";
      payload.trial_ends_at = nextTrial;
      payload.notes = [notesInput.trim(), "Creator: trial extended +7d"].filter(Boolean).join(" | ");
      setBillingStatusInput("trial");
      setTrialEndsAtInput(nextTrial);
      setNotesInput(payload.notes);
    }

    if (type === "start_paid") {
      payload.billing_status = "active";
      payload.starts_at = startsAtInput || now.toISOString().slice(0, 16);
      payload.renews_at = nextRenewal;
      payload.ends_at = endsAtInput || nextEnd;
      payload.notes = [notesInput.trim(), "Creator: moved to paid"].filter(Boolean).join(" | ");
      setBillingStatusInput("active");
      setStartsAtInput(payload.starts_at);
      setRenewsAtInput(nextRenewal);
      setEndsAtInput(payload.ends_at);
      setNotesInput(payload.notes);
    }

    if (type === "push_renewal") {
      payload.renews_at = nextRenewal;
      payload.notes = [notesInput.trim(), "Creator: renewal moved +30d"].filter(Boolean).join(" | ");
      setRenewsAtInput(nextRenewal);
      setNotesInput(payload.notes);
    }

    if (type === "pause_company") {
      payload.status = "paused";
      payload.billing_status = "paused";
      payload.notes = [notesInput.trim(), "Creator: paused company billing"].filter(Boolean).join(" | ");
      setStatusInput("paused");
      setBillingStatusInput("paused");
      setNotesInput(payload.notes);
    }

    await onSaveCompanySubscription?.(company.id, payload);
  }

  async function handleCopyLink(path, type) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      }
      setCopiedLinkType(type);
      window.setTimeout(() => setCopiedLinkType(""), 2200);
    } catch {
      setCopiedLinkType("");
    }
  }

  async function handleCopyOnboardingPack() {
    try {
      const lines = [
        `${company.name}`,
        `${businessTypeLabels[company.business_type] || "Автосервис"} · ${planLabels[planInput] || planInput || "Старт"}`,
        `Вход компании: ${window.location.origin}${companyLoginUrl}`,
        `Форма клиента: ${window.location.origin}${publicRequestUrl}`,
        `Статус запуска: ${launchLane.title}`,
        `Следующий шаг: ${launchLane.note}`,
        ownerStep ? `Owner: ${ownerStep.label}` : "",
        membersStep ? `Команда: ${membersStep.label}` : "",
        servicesStep ? `Услуги: ${servicesStep.label}` : "",
        billingStep ? `Billing: ${billingStep.label}` : ""
      ].filter(Boolean);

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(lines.join("\n"));
      }

      setCopiedLinkType("onboarding");
      window.setTimeout(() => setCopiedLinkType(""), 2200);
    } catch {
      setCopiedLinkType("");
    }
  }

  async function handleCopyStarterAccessPack() {
    if (!starterAccessItems.length) {
      return;
    }

    try {
      const lines = [
        `${company.name}`,
        `Вход компании: ${window.location.origin}${companyLoginUrl}`,
        ...starterAccessItems.map((item) => {
          return `${roleLabels[item.role] || item.role}: ${item.email}${item.password ? ` / ${item.password}` : item.note ? ` / ${item.note}` : ""}`;
        })
      ];

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(lines.join("\n"));
      }

      setCopiedLinkType("starter-access");
      window.setTimeout(() => setCopiedLinkType(""), 2200);
    } catch {
      setCopiedLinkType("");
    }
  }

  async function handleCopyBillingPack() {
    try {
      const lines = buildCommercialOperatorPackLines(commercialContext, window.location.origin);

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(lines.join("\n"));
      }

      setCopiedLinkType("billing-pack");
      window.setTimeout(() => setCopiedLinkType(""), 2200);
    } catch {
      setCopiedLinkType("");
    }
  }

  async function handleCopyOwnerBillingPack() {
    try {
      const lines = buildCommercialOwnerPackLines(commercialContext, window.location.origin);

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(lines.join("\n"));
      }

      setCopiedLinkType("owner-billing-pack");
      window.setTimeout(() => setCopiedLinkType(""), 2200);
    } catch {
      setCopiedLinkType("");
    }
  }

  function applyDemoRequestRecommendation() {
    if (!linkedDemoRequest || !recommendedCompanyPlanCode) {
      return;
    }

    setPlanInput(recommendedCompanyPlanCode);
    if (recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free") {
      const normalizedPrice = recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim();
      setPriceMonthlyInput(normalizedPrice);
    } else if (recommendedPlanConfig?.price === "Free") {
      setPriceMonthlyInput("0");
    }

    const handoffNote = `Storefront handoff: ${recommendedStorefrontPlan} / ${recommendedBillingLabel}`;
    setNotesInput((current) => [current.trim(), handoffNote].filter(Boolean).join(" | "));
  }

  async function applyPaidOnboardingScenario(type) {
    const now = new Date();
    const nextStart = startsAtInput || now.toISOString().slice(0, 16);
    const nextRenewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const nextEnd = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const notesPrefix = notesInput.trim();

    const payload = {
      status: "active",
      plan_code: planInput,
      billing_status: billingStatusInput,
      price_monthly: priceMonthlyInput === "" ? null : Number(priceMonthlyInput),
      starts_at: nextStart,
      trial_ends_at: billingStatusInput === "trial" ? trialEndsAtInput || null : null,
      renews_at: renewsAtInput || nextRenewal,
      ends_at: endsAtInput || nextEnd,
      notes: notesPrefix || null,
      event_payload_extra: buildCommercialEventPayloadExtra(commercialContext)
    };

    if (type === "prepare_manual") {
      payload.billing_status = "manual";
      payload.notes = [notesPrefix, "Creator: manual billing prepared"].filter(Boolean).join(" | ");
      payload.event_type_override = "manual_prepared";
      payload.event_note_override = "Creator prepared manual billing and owner payment pack.";
      setStatusInput("active");
      setBillingStatusInput("manual");
      setStartsAtInput(nextStart);
      setRenewsAtInput(payload.renews_at);
      setEndsAtInput(payload.ends_at);
      setNotesInput(payload.notes);
    }

    if (type === "invoice_sent") {
      payload.billing_status = "manual";
      payload.notes = [notesPrefix, "Creator: invoice sent to owner"].filter(Boolean).join(" | ");
      payload.event_type_override = "invoice_sent";
      payload.event_note_override = "Creator sent invoice / payment instructions to the owner.";
      setStatusInput("active");
      setBillingStatusInput("manual");
      setStartsAtInput(nextStart);
      setRenewsAtInput(payload.renews_at);
      setEndsAtInput(payload.ends_at);
      setNotesInput(payload.notes);
    }

    if (type === "confirm_paid") {
      payload.billing_status = "active";
      payload.notes = [notesPrefix, "Creator: first payment confirmed"].filter(Boolean).join(" | ");
      payload.event_type_override = "payment_confirmed";
      payload.event_note_override = "Creator confirmed first payment and activated paid billing.";
      setStatusInput("active");
      setBillingStatusInput("active");
      setStartsAtInput(nextStart);
      setRenewsAtInput(payload.renews_at);
      setEndsAtInput(payload.ends_at);
      setNotesInput(payload.notes);
    }

    if (type === "pause_after_no_payment") {
      payload.status = "paused";
      payload.billing_status = "paused";
      payload.notes = [notesPrefix, "Creator: paused after no payment confirmation"].filter(Boolean).join(" | ");
      payload.event_type_override = "payment_paused";
      payload.event_note_override = "Creator paused the company after missing payment confirmation.";
      setStatusInput("paused");
      setBillingStatusInput("paused");
      setNotesInput(payload.notes);
    }

    await onSaveCompanySubscription?.(company.id, payload);
  }

  return (
    <article className={`platform-company-card status-${company.status}`}>
      <div className="platform-company-head">
        <div>
          <strong>{company.name}</strong>
          <span>{company.slug}</span>
        </div>
        <div className="platform-head-actions">
          <span className={`platform-status-chip status-${company.status}`}>{formatCompanyStatus(company.status)}</span>
          <div className="platform-quick-actions">
            {linkedDemoRequest ? (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => onOpenDemoRequest?.(linkedDemoRequest.id, linkedDemoRequest.status || "all")}
              >
                Handoff
              </button>
            ) : null}
            <button type="button" className="button button-ghost" disabled={saving || statusInput === "active"} onClick={() => applyQuickStatus("active")}>
              Активировать
            </button>
            <button type="button" className="button button-ghost" disabled={saving || statusInput === "paused"} onClick={() => applyQuickStatus("paused")}>
              Пауза
            </button>
          </div>
        </div>
      </div>

      <div className="platform-company-meta">
        <div>
          <small>Ниша</small>
          <strong>{businessTypeLabels[company.business_type] || "Автосервис"}</strong>
        </div>
        <div>
          <small>Владелец</small>
          <strong>{company.owner_name || "Не назначен"}</strong>
        </div>
        <div>
          <small>Подключена</small>
          <strong>{formatDate(company.owner_connected_at || company.created_at)}</strong>
        </div>
        <div>
          <small>Тариф</small>
          <strong>{planLabels[planInput] || planInput || "Старт"}</strong>
        </div>
        <div>
          <small>Телефон</small>
          <strong>{company.contact_phone || "Не указан"}</strong>
        </div>
        <div>
          <small>Email</small>
          <strong>{company.contact_email || company.owner_email || "Не указан"}</strong>
        </div>
        <div>
          <small>Сотрудники</small>
          <strong>{activeMembersCount}</strong>
        </div>
        <div>
          <small>Manager / master</small>
          <strong>{managerMembersCount} / {detailerMembersCount}</strong>
        </div>
        <div>
          <small>Рабочая команда</small>
          <strong>{activeStaffMembersCount}</strong>
        </div>
        <div>
          <small>Клиенты</small>
          <strong>{company.clients_count || 0}</strong>
        </div>
        <div>
          <small>Заявки</small>
          <strong>{company.leads_count || 0}</strong>
        </div>
        <div>
          <small>Услуги</small>
          <strong>{company.services_count || 0}</strong>
        </div>
        <div>
          <small>Лимит тарифа</small>
          <strong>{formatSeatLimit(activePlanCode)}</strong>
        </div>
        <div>
          <small>Статус лимита</small>
          <strong>{seatOverLimit ? "Превышен" : "В норме"}</strong>
        </div>
      </div>

      <div className="platform-company-actions platform-billing-actions">
        <button type="button" className="button button-ghost" disabled={saving || billingStatusInput === "trial"} onClick={() => applyQuickBilling("trial")}>
          Триал
        </button>
        <button type="button" className="button button-ghost" disabled={saving || billingStatusInput === "active"} onClick={() => applyQuickBilling("active")}>
          Активировать оплату
        </button>
        <button type="button" className="button button-ghost" disabled={saving || billingStatusInput === "manual"} onClick={() => applyQuickBilling("manual")}>
          Ручной режим
        </button>
        <button type="button" className="button button-ghost" disabled={saving || billingStatusInput === "paused"} onClick={() => applyQuickBilling("paused")}>
          Пауза оплаты
        </button>
      </div>

      <div className="platform-scenario-grid">
        <button type="button" className="button button-outline" disabled={saving} onClick={() => applyBillingScenario("extend_trial")}>
          Продлить trial на 7 дней
        </button>
        <button type="button" className="button button-outline" disabled={saving} onClick={() => applyBillingScenario("start_paid")}>
          Перевести в paid
        </button>
        <button type="button" className="button button-outline" disabled={saving} onClick={() => applyBillingScenario("push_renewal")}>
          Сдвинуть renewal на 30 дней
        </button>
        <button type="button" className="button button-outline" disabled={saving} onClick={() => applyBillingScenario("pause_company")}>
          Пауза company + billing
        </button>
      </div>

      <section className="platform-company-handoff platform-company-paid-close">
        <div className="section-title compact">
          <div>
            <span className="eyebrow">Paid close control</span>
            <h2>Что делать по этой компании прямо сейчас</h2>
          </div>
          <div className="section-title-aux">
            {paidQueuePosition ? <span>Очередь #{paidQueuePosition}</span> : <span>Вне paid queue</span>}
          </div>
        </div>

        <div className="platform-paid-close-grid">
          <article className="platform-paid-close-card">
            <span>Коммерческая стадия</span>
            <strong className={`platform-commercial-stage tone-${commercialStageTone}`}>
              {formatCommercialCloseStage(commercialStage)}
            </strong>
          </article>
          <article className="platform-paid-close-card">
            <span>Paid readiness</span>
            <strong className={`platform-status-chip status-${paidStatusTone}`}>
              {paidReadiness.goLive?.readiness === "ready_for_paid"
                ? "Ready for paid"
                : paidReadiness.goLive?.readiness === "almost_ready"
                ? "Почти ready"
                : "Есть блокеры"}
            </strong>
          </article>
          <article className="platform-paid-close-card">
            <span>Следующий шаг</span>
            <strong>{paidReadiness.nextStep}</strong>
          </article>
          <article className="platform-paid-close-card">
            <span>Осталось блокеров</span>
            <strong>{paidBlockers.length}</strong>
          </article>
        </div>

        {paidBlockers.length ? (
          <div className="platform-company-list-signals">
            {paidBlockers.slice(0, 4).map((blocker) => (
              <span key={`${company.id}-paid-blocker-${blocker.key}`}>{blocker.label}</span>
            ))}
          </div>
        ) : null}

        {primaryPaidAction ? (
          <div className="platform-company-closer-note">
            <strong>Рекомендуемый шаг:</strong>
            <span>{primaryPaidAction.note}</span>
          </div>
        ) : null}

        <div className="platform-company-starter-grid">
          {primaryPaidAction ? (
            <button
              type="button"
              className="button button-secondary"
              disabled={saving || launchBundleSaving || starterAccessCreating || applyingServicePack}
              onClick={() => {
                if (primaryPaidAction.key === "active") {
                  return applyQuickStatus("active");
                }
                if (primaryPaidAction.key === "starter_bundle") {
                  return onCreateStarterBundle?.(company.id);
                }
                if (primaryPaidAction.key === "service_pack") {
                  return onApplyServicePack?.(company.id, company.business_type || "detailing");
                }
                if (primaryPaidAction.key === "prepare_manual" || primaryPaidAction.key === "invoice_sent" || primaryPaidAction.key === "confirm_paid") {
                  return applyPaidOnboardingScenario(primaryPaidAction.key);
                }
                if (primaryPaidAction.key === "ready_pack" || primaryPaidAction.key === "full_manual") {
                  return onApplyFullLaunchBundle?.(company.id, {
                    mode: primaryPaidAction.key === "full_manual" ? "manual" : "trial",
                    plan_code: recommendedCompanyPlanCode || planInput,
                    price_monthly:
                      recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free"
                        ? Number(recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim())
                        : commercialAmount || null,
                    requestId: linkedDemoRequest?.id || null
                  });
                }
                return null;
              }}
            >
              {primaryPaidAction.label}
            </button>
          ) : null}
          {statusInput !== "active" ? (
            <button type="button" className="button button-outline" disabled={saving} onClick={() => applyQuickStatus("active")}>
              Перевести в active
            </button>
          ) : null}
          {activeStaffMembersCount === 0 ? (
            <button
              type="button"
              className="button button-outline"
              disabled={starterAccessCreating}
              onClick={() => onCreateStarterBundle?.(company.id)}
            >
              Выдать starter bundle
            </button>
          ) : null}
          {Number(company.services_count || 0) === 0 ? (
            <button
              type="button"
              className="button button-outline"
              disabled={applyingServicePack}
              onClick={() => onApplyServicePack?.(company.id, company.business_type || "detailing")}
            >
              {applyingServicePack ? "Загружаем услуги..." : "Загрузить услуги"}
            </button>
          ) : null}
          <button type="button" className="button button-outline" disabled={saving} onClick={() => applyPaidOnboardingScenario("prepare_manual")}>
            Manual
          </button>
          <button type="button" className="button button-outline" disabled={saving} onClick={() => applyPaidOnboardingScenario("invoice_sent")}>
            Sent
          </button>
          <button type="button" className="button button-outline" disabled={saving} onClick={() => applyPaidOnboardingScenario("confirm_paid")}>
            Paid
          </button>
          {(paidReadiness.readyPackEligible || paidReadiness.manualBillingRecommended) ? (
            <button
              type="button"
              className="button button-secondary"
              disabled={launchBundleSaving || starterAccessCreating}
              onClick={() =>
                onApplyFullLaunchBundle?.(company.id, {
                  mode: paidReadiness.manualBillingRecommended ? "manual" : "trial",
                  plan_code: recommendedCompanyPlanCode || planInput,
                  price_monthly:
                    recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free"
                      ? Number(recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim())
                      : commercialAmount || null,
                  requestId: linkedDemoRequest?.id || null
                })
              }
            >
              {paidReadiness.manualBillingRecommended ? "Full manual" : "Ready pack"}
            </button>
          ) : null}
          <button type="button" className="button button-outline" onClick={handleCopyBillingPack}>
            {copiedLinkType === "billing-pack" ? "Billing pack скопирован" : "Billing pack"}
          </button>
        </div>
      </section>

      {companyWarnings.length ? (
        <div className="platform-warning-list">
          {companyWarnings.map((warning) => (
            <div key={warning} className="platform-warning-item">
              {warning}
            </div>
          ))}
        </div>
      ) : null}

      {controlState ? (
        <section className="platform-company-control">
          <div className="section-title compact">
            <div>
              <span className="eyebrow">Control state</span>
              <h2>Как creator должен вести эту компанию</h2>
            </div>
            <div className="section-title-aux">
              <span className={`platform-status-chip control-${controlState.bucket}`}>{controlState.title}</span>
            </div>
          </div>
          <div className="platform-company-control-grid">
            <article className="platform-company-control-card">
              <span>Следующий шаг</span>
              <strong>{controlState.nextStep}</strong>
            </article>
            <article className="platform-company-control-card">
              <span>Срок / режим</span>
              <strong>{controlState.dueLabel}</strong>
            </article>
          </div>
          <div className="platform-company-control-list">
            {controlState.actionItems.map((item) => (
              <div key={`${company.id}-control-${item}`} className="platform-company-control-item">
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {linkedDemoRequest ? (
        <section className="platform-company-handoff">
          <div className="section-title compact">
            <div>
              <span className="eyebrow">Storefront handoff</span>
              <h2>Что пришло из заявки на подключение</h2>
            </div>
            {linkedDemoActivation ? (
              <div className="section-title-aux">
                <span className={`platform-status-chip activation-stage-chip stage-${linkedDemoActivation.stage}`}>
                  {formatActivationStage(linkedDemoActivation.stage)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="platform-company-handoff-grid">
            <article className="platform-company-handoff-card">
              <span>Пакет с витрины</span>
              <strong>{recommendedStorefrontPlan}</strong>
            </article>
            <article className="platform-company-handoff-card">
              <span>Для CRM</span>
              <strong>{recommendedCompanyPlan}</strong>
            </article>
            <article className="platform-company-handoff-card">
              <span>Период</span>
              <strong>{recommendedBillingLabel}</strong>
            </article>
            <article className="platform-company-handoff-card">
              <span>Команда / локации</span>
              <strong>{linkedDemoCommerce?.teamSize || linkedDemoRequest.employees_count || "—"} / {linkedDemoCommerce?.locations || linkedDemoRequest.locations_count || "—"}</strong>
            </article>
          </div>
          <div className="platform-company-handoff-actions">
            <button type="button" className="button button-outline" onClick={applyDemoRequestRecommendation}>
              Подставить тариф из заявки
            </button>
            <button
              type="button"
              className="button button-outline"
              disabled={applyingServicePack}
              onClick={() => onApplyServicePack?.(company.id, company.business_type || "detailing")}
            >
              {applyingServicePack ? "Загружаем услуги..." : "Загрузить услуги ниши"}
            </button>
            <button
              type="button"
              className="button button-outline"
              disabled={saving || billingStatusInput === "trial"}
              onClick={() => applyQuickBilling("trial")}
            >
              Завести trial-подписку
            </button>
            <button
              type="button"
              className="button button-outline"
              disabled={saving || statusInput === "active"}
              onClick={() => applyQuickStatus("active")}
            >
              Сделать active
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={() => onOpenDemoRequest?.(linkedDemoRequest.id, linkedDemoRequest.status || "all")}
            >
              Открыть связанную заявку
            </button>
          </div>
          {activationChecklist.length ? (
            <div className="platform-activation-checklist">
              {activationChecklist.map((item) => (
                <article key={`${company.id}-${item.key}`} className={`platform-activation-checklist-item ${item.done ? "done" : "todo"}`}>
                  <span>{item.done ? "OK" : "Шаг"}</span>
                  <strong>{item.label}</strong>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="platform-company-handoff platform-company-launch-bundle">
        <div className="section-title compact">
          <div>
            <span className="eyebrow">Launch bundle</span>
            <h2>Подготовить запуск одной пачкой</h2>
          </div>
          <div className="section-title-aux">
            <span>{launchBundleSaving ? "Запускаем пакет..." : "Статус, billing, сервисы, handoff"}</span>
          </div>
        </div>

        <div className="platform-company-starter-grid">
          <button
            type="button"
            className="button button-secondary"
            disabled={launchBundleSaving || starterAccessCreating}
            onClick={() =>
              onApplyFullLaunchBundle?.(company.id, {
                mode: "trial",
                plan_code: recommendedCompanyPlanCode || planInput,
                price_monthly:
                  recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free"
                    ? Number(recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim())
                    : null,
                requestId: linkedDemoRequest?.id || null
              })
            }
          >
            {launchBundleSaving || starterAccessCreating ? "Готовим..." : "Full launch + access"}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={launchBundleSaving}
            onClick={() =>
              onApplyLaunchBundle?.(company.id, {
                mode: "trial",
                plan_code: recommendedCompanyPlanCode || planInput,
                price_monthly:
                  recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free"
                    ? Number(recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim())
                    : null,
                requestId: linkedDemoRequest?.id || null
              })
            }
          >
            {launchBundleSaving ? "Готовим..." : "Active + trial + service pack"}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={launchBundleSaving}
            onClick={() =>
              onApplyLaunchBundle?.(company.id, {
                mode: "manual",
                plan_code: recommendedCompanyPlanCode || planInput,
                price_monthly:
                  recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free"
                    ? Number(recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim())
                    : null,
                requestId: linkedDemoRequest?.id || null
              })
            }
          >
            {launchBundleSaving ? "Готовим..." : "Active + manual + service pack"}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={launchBundleSaving || !linkedDemoRequest}
            onClick={() =>
              linkedDemoRequest
                ? onApplyLaunchBundle?.(company.id, {
                    mode: "trial",
                    plan_code: recommendedCompanyPlanCode || planInput,
                    price_monthly:
                      recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free"
                        ? Number(recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim())
                        : null,
                    requestId: linkedDemoRequest.id
                  })
                : null
            }
          >
            {launchBundleSaving ? "Готовим..." : "Закрыть handoff пакетом"}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={launchBundleSaving || applyingServicePack}
            onClick={() => onApplyServicePack?.(company.id, company.business_type || "detailing")}
          >
            {applyingServicePack ? "Загружаем..." : "Только service pack"}
          </button>
        </div>

        <div className="platform-company-closer-note">
          <strong>Что делает пакет:</strong>
          <span>Переводит компанию в `active`, ставит billing-режим, подхватывает тариф из handoff, загружает пакет услуг и при связанной заявке закрывает её в `connected`.</span>
        </div>
        <div className="platform-company-closer-note">
          <strong>Full launch + access:</strong>
          <span>Сразу закрывает launch bundle и создаёт недостающие owner / manager / master доступы без дублей.</span>
        </div>
      </section>

      <section className="platform-company-handoff platform-company-launch-bundle">
        <div className="section-title compact">
          <div>
            <span className="eyebrow">Manual billing</span>
            <h2>Коммерческий запуск без лишней ручной путаницы</h2>
          </div>
          <div className="section-title-aux">
            <span>{manualBillingReady ? "Ручная оплата уже собрана" : "Собрать счёт / оплату / активацию"}</span>
          </div>
        </div>

        <div className="platform-company-handoff-grid">
          <article className="platform-company-handoff-card">
            <span>Сумма</span>
            <strong>{commercialChargeSummary.chargeAmount ? `${platformEurFormatter.format(commercialChargeSummary.chargeAmount)} ${commercialChargeSummary.chargeSuffix}` : "Уточнить вручную"}</strong>
            <small>{commercialChargeSummary.chargeNote || `${recommendedBillingLabel} без дополнительной наценки`}</small>
          </article>
          <article className="platform-company-handoff-card">
            <span>Billing-режим</span>
            <strong>{formatBillingStatus(billingStatusInput || subscription?.billing_status || "trial")}</strong>
          </article>
          <article className="platform-company-handoff-card">
            <span>Период</span>
            <strong>{recommendedBillingLabel}</strong>
            <small>{recommendedChargeSummary.monthlyEquivalent != null ? `${platformEurFormatter.format(recommendedChargeSummary.monthlyEquivalent)} EUR MRR` : "Период из handoff"}</small>
          </article>
          <article className="platform-company-handoff-card">
            <span>Коммерческий шаг</span>
            <strong>{paidReadiness.nextStep}</strong>
          </article>
          <article className="platform-company-handoff-card">
            <span>Контакт</span>
            <strong>{company.owner_email || company.contact_email || company.contact_phone || "Не указан"}</strong>
          </article>
        </div>

        <div className="platform-subscription-form platform-commercial-form">
          <label>
            Канал оплаты
            <select value={manualPaymentChannelInput} onChange={(event) => setManualPaymentChannelInput(event.target.value)}>
              <option value="bank_transfer">Перевод / IBAN</option>
              <option value="card_link">Ссылка на оплату</option>
              <option value="cash">Наличные</option>
              <option value="mixed">Смешанный способ</option>
            </select>
          </label>
          <label>
            Срок оплаты
            <input
              type="datetime-local"
              value={manualPaymentDueAtInput}
              onChange={(event) => setManualPaymentDueAtInput(event.target.value)}
            />
          </label>
          <label className="platform-company-foot">
            Комментарий владельцу
            <textarea
              value={manualPaymentNoteInput}
              placeholder="Например: оплатите переводом и пришлите подтверждение, после этого сразу активируем компанию."
              onChange={(event) => setManualPaymentNoteInput(event.target.value)}
            />
          </label>
        </div>

        <div className="platform-manual-billing-progress">
          <article className={`platform-manual-billing-step ${manualBillingPrepared ? "done" : "todo"}`}>
            <span>01</span>
            <strong>Manual prepared</strong>
            <p>{latestManualPreparedEvent?.created_at ? formatDateTime(latestManualPreparedEvent.created_at) : manualBillingPrepared ? "Уже подготовлен" : "Ещё не подготовлен"}</p>
          </article>
          <article className={`platform-manual-billing-step ${manualBillingInvoiceSent ? "done" : "todo"}`}>
            <span>02</span>
            <strong>Invoice sent</strong>
            <p>{latestInvoiceSentEvent?.created_at ? formatDateTime(latestInvoiceSentEvent.created_at) : manualBillingInvoiceSent ? "Уже отправлен" : "Ещё не отмечен"}</p>
          </article>
          <article className={`platform-manual-billing-step ${manualBillingPaid ? "done" : "todo"}`}>
            <span>03</span>
            <strong>Paid confirmed</strong>
            <p>{latestPaymentConfirmedEvent?.created_at ? formatDateTime(latestPaymentConfirmedEvent.created_at) : manualBillingPaid ? "Оплата уже подтверждена" : "Ждёт подтверждения"}</p>
          </article>
        </div>

        <div className="platform-company-starter-grid">
          <button type="button" className="button button-secondary" disabled={saving} onClick={() => applyPaidOnboardingScenario("prepare_manual")}>
            Подготовить manual billing
          </button>
          <button type="button" className="button button-outline" disabled={saving} onClick={() => applyPaidOnboardingScenario("invoice_sent")}>
            Отметить счёт отправленным
          </button>
          <button type="button" className="button button-outline" disabled={saving} onClick={() => applyPaidOnboardingScenario("confirm_paid")}>
            Подтвердить первую оплату
          </button>
          <button type="button" className="button button-outline" disabled={saving} onClick={() => applyPaidOnboardingScenario("pause_after_no_payment")}>
            Пауза без оплаты
          </button>
          <button type="button" className="button button-outline" onClick={handleCopyOwnerBillingPack}>
            Сообщение владельцу
          </button>
          <button type="button" className="button button-outline" onClick={handleCopyBillingPack}>
            {copiedLinkType === "billing-pack" ? "Operator pack скопирован" : "Operator pack"}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={launchBundleSaving || starterAccessCreating}
            onClick={() =>
              onApplyFullLaunchBundle?.(company.id, {
                mode: "manual",
                plan_code: recommendedCompanyPlanCode || planInput,
                price_monthly:
                  recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free"
                    ? Number(recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim())
                    : commercialAmount || null,
                requestId: linkedDemoRequest?.id || null
              })
            }
          >
            {launchBundleSaving || starterAccessCreating ? "Готовим..." : "Full launch + manual + access"}
          </button>
        </div>

        <div className="platform-company-closer-note">
          <strong>Как использовать сейчас:</strong>
          <span>Сначала довести owner / команду / услуги, потом `prepare manual`, затем `invoice sent`, после оплаты нажать `confirm paid` и оставить компанию в active billing.</span>
        </div>
      </section>

      <section className="platform-company-handoff platform-company-launch">
        <div className="section-title compact">
          <div>
            <span className="eyebrow">Paid onboarding</span>
            <h2>Готовность к реальной оплате и запуску</h2>
          </div>
          <div className="section-title-aux">
            <span className={`platform-status-chip status-${goLiveChecklist.readiness === "ready" ? "active" : goLiveChecklist.readiness === "almost_ready" ? "paused" : "archived"}`}>
              {goLiveChecklist.readiness === "ready" ? "Готова" : goLiveChecklist.readiness === "almost_ready" ? "Почти готова" : "Есть блокеры"}
            </span>
          </div>
        </div>
        <div className="platform-company-closer-note">
          <strong>Коммерческий фокус:</strong>
          <span>{paidReadiness.nextStep}</span>
        </div>
        <div className="platform-activation-checklist">
          {goLiveChecklist.items.map((item) => (
            <article key={`${company.id}-launch-${item.key}`} className={`platform-activation-checklist-item ${item.done ? "done" : "todo"}`}>
              <span>{item.done ? "OK" : "Шаг"}</span>
              <strong>{item.label}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-company-handoff platform-company-closer">
        <div className="section-title compact">
          <div>
            <span className="eyebrow">Owner / team closing</span>
            <h2>Что нужно довести по этому запуску</h2>
          </div>
          <div className="section-title-aux">
            <span className={`platform-status-chip lane-${launchLane.accent}`}>{launchLane.title}</span>
          </div>
        </div>

        <div className="platform-company-closer-grid">
          <article className={`platform-company-closer-card ${ownerStep?.done ? "done" : "todo"}`}>
            <span>Owner</span>
            <strong>{ownerStep?.label || "Owner-контур без явного блока"}</strong>
          </article>
          <article className={`platform-company-closer-card ${membersStep?.done ? "done" : "todo"}`}>
            <span>Команда</span>
            <strong>{membersStep?.label || "Командный контур без явного блока"}</strong>
          </article>
          <article className={`platform-company-closer-card ${servicesStep?.done ? "done" : "todo"}`}>
            <span>Услуги</span>
            <strong>{servicesStep?.label || "Пакет услуг без явного блока"}</strong>
          </article>
          <article className={`platform-company-closer-card ${billingStep?.done ? "done" : "todo"}`}>
            <span>Billing</span>
            <strong>{billingStep?.label || "Billing-контур без явного блока"}</strong>
          </article>
        </div>

        <div className="platform-company-closer-note">
          <strong>Следующий шаг создателя:</strong>
          <span>{launchLane.note}</span>
        </div>
        <div className="platform-company-closer-note">
          <strong>По факту сейчас:</strong>
          <span>
            Owner: {company.owner_connected_at ? "подключён" : "ещё не подключён"} ·
            Команда: {activeStaffMembersCount} рабочих доступа ·
            Manager: {managerMembersCount} ·
            Master: {detailerMembersCount}
          </span>
        </div>

        <div className="platform-company-handoff-actions">
          <button type="button" className="button button-outline" onClick={() => handleCopyLink(publicCompanyUrl, "company")}>
            Копировать страницу компании
          </button>
          <button type="button" className="button button-outline" onClick={() => handleCopyLink(companyLoginUrl, "login")}>
            Копировать вход компании
          </button>
          <button type="button" className="button button-outline" onClick={() => handleCopyLink(publicRequestUrl, "request")}>
            Копировать форму клиента
          </button>
          <button type="button" className="button button-secondary" onClick={handleCopyOnboardingPack}>
            Копировать onboarding-пакет
          </button>
        </div>
      </section>

      <section className="platform-company-handoff platform-company-starter-access">
        <div className="section-title compact">
          <div>
            <span className="eyebrow">Starter access</span>
            <h2>Создать стартовые доступы после handoff</h2>
          </div>
          <div className="section-title-aux">
            <span>{starterAccessItems.length ? `${starterAccessItems.length} сохранено в этой сессии` : "Пока без новых доступов"}</span>
          </div>
        </div>

        <div className="platform-company-starter-grid">
          <button type="button" className="button button-outline" disabled={starterAccessCreating} onClick={() => onCreateStarterAccess?.(company.id, "owner")}>
            {starterAccessCreating ? "Создаём..." : "Создать owner"}
          </button>
          <button type="button" className="button button-outline" disabled={starterAccessCreating} onClick={() => onCreateStarterAccess?.(company.id, "manager")}>
            {starterAccessCreating ? "Создаём..." : "Создать manager"}
          </button>
          <button type="button" className="button button-outline" disabled={starterAccessCreating} onClick={() => onCreateStarterAccess?.(company.id, "detailer")}>
            {starterAccessCreating ? "Создаём..." : "Создать master"}
          </button>
          <button type="button" className="button button-secondary" disabled={starterAccessCreating} onClick={() => onCreateStarterBundle?.(company.id)}>
            {starterAccessCreating ? "Создаём..." : "Создать стартовый набор"}
          </button>
        </div>

        {starterAccessItems.length ? (
          <>
            <div className="platform-company-starter-list">
              {starterAccessItems.map((item) => (
                <article key={`${item.email}-${item.created_at}`} className="platform-company-starter-card">
                  <span>{roleLabels[item.role] || item.role}</span>
                  <strong>{item.full_name}</strong>
                  <p>{item.email}</p>
                  <code>{item.password || "Пароль не менялся"}</code>
                  {item.note ? <small>{item.note}</small> : null}
                </article>
              ))}
            </div>
            <div className="platform-company-handoff-actions">
              <button type="button" className="button button-outline" onClick={handleCopyStarterAccessPack}>
                Копировать access pack
              </button>
            </div>
          </>
        ) : (
          <div className="platform-company-closer-note">
            <strong>Зачем это тут:</strong>
            <span>После создания компании можно сразу выпустить owner / manager / master доступы и не собирать первый вход вручную по разным экранам.</span>
          </div>
        )}
      </section>

      <form className="platform-subscription-form" onSubmit={handleSubmit}>
        <label>
          Статус компании
          <select value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
            <option value="active">Активна</option>
            <option value="paused">На паузе</option>
            <option value="archived">Архив</option>
          </select>
        </label>

        <label>
          Тариф
          <select value={planInput} onChange={(event) => setPlanInput(event.target.value)}>
            <option value="starter">Старт</option>
            <option value="pro">Про</option>
            <option value="studio">Студия</option>
          </select>
        </label>

        <label>
          Биллинг
          <select value={billingStatusInput} onChange={(event) => setBillingStatusInput(event.target.value)}>
            {billingStatusOptions.map((status) => (
              <option key={status} value={status}>
                {formatBillingStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Цена / месяц (EUR)
          <input type="number" min="0" step="1" value={priceMonthlyInput} onChange={(event) => setPriceMonthlyInput(event.target.value)} />
        </label>

        <label>
          Старт подписки
          <input type="datetime-local" value={startsAtInput} onChange={(event) => setStartsAtInput(event.target.value)} />
        </label>

        <label>
          Триал до
          <input type="datetime-local" value={trialEndsAtInput} onChange={(event) => setTrialEndsAtInput(event.target.value)} />
        </label>

        <label>
          Продление
          <input type="datetime-local" value={renewsAtInput} onChange={(event) => setRenewsAtInput(event.target.value)} />
        </label>

        <label>
          Окончание
          <input type="datetime-local" value={endsAtInput} onChange={(event) => setEndsAtInput(event.target.value)} />
        </label>

        <label className="platform-subscription-notes">
          Внутренняя заметка
          <textarea
            rows="3"
            value={notesInput}
            onChange={(event) => setNotesInput(event.target.value)}
            placeholder="Например: ручная активация, договор до конца месяца, переход на тариф Про после оплаты."
          />
        </label>

        <div className="platform-company-foot">
          <div className="platform-company-note">
            Под создателем здесь уже живут активация компании, план, биллинг и ручное ведение подписки.
          </div>
          <div className="platform-company-actions">
            <button type="button" className="button button-outline" onClick={() => onFocusCompany?.(company.id)}>
              Открыть обзор
            </button>
            <a href={companyLoginUrl} className="button button-outline">
              Вход компании
            </a>
            <button type="button" className="button button-ghost" onClick={() => handleCopyLink(companyLoginUrl, "login")}>
              Копировать вход
            </button>
            <a href={publicCompanyUrl} className="button button-outline">
              Страница компании
            </a>
            <button type="button" className="button button-ghost" onClick={() => handleCopyLink(publicCompanyUrl, "company")}>
              Копировать страницу
            </button>
            <a href={publicRequestUrl} className="button button-outline">
              Форма клиента
            </a>
            <button type="button" className="button button-ghost" onClick={() => handleCopyLink(publicRequestUrl, "request")}>
              Копировать форму
            </button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            {accessibleCompanyIds.has(company.id) ? (
              <button type="button" className="button button-outline" onClick={() => onOpenCompany?.(company.id)}>
                Открыть CRM компании
              </button>
            ) : (
              <button type="button" className="button button-outline" disabled title="Под creator-аккаунтом доступен только кабинет платформы. Для CRM компании используй owner/manager логин.">
                CRM открывается под директором
              </button>
            )}
          </div>
        </div>
        {copiedLinkType ? (
          <p className="status-note success">
            {copiedLinkType === "login"
              ? "Ссылка на вход скопирована."
              : copiedLinkType === "request"
              ? "Ссылка на форму клиента скопирована."
              : copiedLinkType === "company"
              ? "Страница компании скопирована."
              : copiedLinkType === "billing-pack"
              ? "Operator pack скопирован."
              : copiedLinkType === "owner-billing-pack"
              ? "Сообщение владельцу скопировано."
              : copiedLinkType === "starter-access"
              ? "Access pack скопирован."
              : "Onboarding-пакет скопирован."}
          </p>
        ) : null}
      </form>

      <div className="platform-company-billing-strip">
        <div className="platform-company-billing-chip">
          <span>Billing</span>
          <strong>{formatBillingStatus(billingStatusInput)}</strong>
        </div>
        <div className="platform-company-billing-chip">
          <span>Trial</span>
          <strong>
            {trialDaysLeft == null ? "—" : trialDaysLeft < 0 ? `-${Math.abs(trialDaysLeft)} дн.` : `${trialDaysLeft} дн.`}
          </strong>
        </div>
        <div className="platform-company-billing-chip">
          <span>Renewal</span>
          <strong>
            {renewDaysLeft == null ? "—" : renewDaysLeft < 0 ? `-${Math.abs(renewDaysLeft)} дн.` : `${renewDaysLeft} дн.`}
          </strong>
        </div>
        <div className="platform-company-billing-chip">
          <span>MRR</span>
          <strong>{priceMonthlyInput ? `${priceMonthlyInput} EUR` : "—"}</strong>
        </div>
      </div>

      <div className="platform-company-history">
        <div className="section-title compact">
          <div>
            <span className="eyebrow">История компании</span>
            <h2>Последние creator-действия</h2>
          </div>
        </div>

        {subscriptionEvents.length ? (
          <div className="platform-company-history-list">
            {subscriptionEvents.map((event) => (
              <article key={event.id} className="platform-company-history-item">
                <div className="platform-company-history-head">
                  <strong>{formatSubscriptionEventType(event.event_type)}</strong>
                  <span>{formatDateTime(event.created_at)}</span>
                </div>
                <div className="platform-company-history-meta">
                  {event.payload?.plan_code ? <span>{planLabels[event.payload.plan_code] || event.payload.plan_code}</span> : null}
                  {event.payload?.billing_status ? <span>{formatBillingStatus(event.payload.billing_status)}</span> : null}
                  {event.payload?.price_monthly ? <span>{Number(event.payload.price_monthly)} EUR</span> : null}
                  {event.payload?.charge_amount ? <span>{Number(event.payload.charge_amount)} {event.payload?.charge_suffix || "EUR"}</span> : null}
                  {event.payload?.payment_channel ? <span>{formatManualBillingChannel(event.payload.payment_channel)}</span> : null}
                  {event.payload?.payment_due_at ? <span>{formatDateTime(event.payload.payment_due_at)}</span> : null}
                </div>
                <p>{event.note || "Без заметки."}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">По этой компании ещё нет истории creator-изменений.</div>
        )}
      </div>
    </article>
  );
}

function PlatformCompanyPreview({ company, subscription, linkedDemoRequest = null, canOpenCrm = false, onOpenCompany, onOpenDemoRequest }) {
  const planCode = subscription?.plan_code || company.plan_code || "starter";
  const billingStatus = subscription?.billing_status || "trial";
  const seatLimit = planSeatLimits[planCode];
  const activeMembersCount = Number(company.active_members_count || 0);
  const seatsLeft = seatLimit == null ? null : seatLimit - activeMembersCount;
  const trialDaysLeft = getDaysUntil(subscription?.trial_ends_at);
  const renewDaysLeft = getDaysUntil(subscription?.renews_at);
  const publicRequestUrl = `/request?company_slug=${encodeURIComponent(company.slug || "")}`;
  const companyLoginUrl = `/login?company_slug=${encodeURIComponent(company.slug || "")}`;
  const publicCompanyUrl = `/s/${encodeURIComponent(company.slug || "")}`;
  const [copiedLinkType, setCopiedLinkType] = useState("");
  const businessTemplate = businessTypeTemplateContent[company.business_type] || businessTypeTemplateContent.detailing;
  const linkedDemoCommerce = linkedDemoRequest ? getDemoRequestCommerceSnapshot(linkedDemoRequest) : null;
  const quickFacts = [
    { label: "Компания", value: company.name },
    { label: "Код компании", value: company.slug || "—" },
    { label: "Ниша", value: businessTypeLabels[company.business_type] || "Автосервис" },
    { label: "Статус", value: formatCompanyStatus(company.status) },
    { label: "Тариф", value: planLabels[planCode] || planCode || "Старт" },
    { label: "Биллинг", value: formatBillingStatus(billingStatus) },
    { label: "Владелец", value: company.owner_name || "Не назначен" },
    { label: "Почта владельца", value: company.owner_email || "Не указана" },
    { label: "Телефон", value: company.contact_phone || "Не указан" },
    { label: "Почта компании", value: company.contact_email || "Не указана" },
    { label: "Сотрудники", value: String(company.active_members_count || 0) },
    { label: "Клиенты", value: String(company.clients_count || 0) },
    { label: "Заявки", value: String(company.leads_count || 0) },
    { label: "Услуги", value: String(company.services_count || 0) }
  ];
  const operationalNotes = [
    seatLimit == null
      ? "Лимит команды не ограничен этим тарифом."
      : seatsLeft < 0
      ? `Лимит команды превышен на ${Math.abs(seatsLeft)} сотрудников.`
      : seatsLeft === 0
      ? "Команда упёрлась в лимит тарифа."
      : `До лимита тарифа осталось ${seatsLeft} мест.`,
    billingStatus === "past_due"
      ? "Есть просрочка по оплате: нужен контакт с владельцем."
      : billingStatus === "paused"
      ? "Подписка на паузе: проверьте, можно ли вернуть компанию в активный контур."
      : billingStatus === "trial" && trialDaysLeft != null
      ? trialDaysLeft < 0
        ? "Триал завершён: пора перевести компанию в платящий статус или закрыть решение."
        : `Триал ещё идёт${trialDaysLeft <= 7 ? `, до окончания ${trialDaysLeft} дн.` : "."}`
      : "По биллингу сейчас нет критичных сигналов.",
    renewDaysLeft != null && renewDaysLeft >= 0 && renewDaysLeft <= 14
      ? `Ближайшее продление через ${renewDaysLeft} дн.`
      : "Ближайшее продление не требует срочного внимания."
  ];

  async function handleCopyLink(path, type) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      }
      setCopiedLinkType(type);
      window.setTimeout(() => setCopiedLinkType(""), 2200);
    } catch {
      setCopiedLinkType("");
    }
  }

  return (
    <section className={`platform-company-preview status-${company.status}`}>
      <div className="platform-company-preview-head">
        <div>
          <span className="eyebrow">Быстрый обзор</span>
          <h2>{company.name}</h2>
          <p>Контекст компании для создателя: статус, подписка, владелец, загрузка и быстрые ссылки без входа в чужую CRM.</p>
        </div>
        <div className="platform-company-preview-actions">
          <a href={publicCompanyUrl} className="button button-outline">
            Страница компании
          </a>
          <button type="button" className="button button-ghost" onClick={() => handleCopyLink(publicCompanyUrl, "company")}>
            Копировать страницу
          </button>
          <a href={publicRequestUrl} className="button button-outline">
            Форма клиента
          </a>
          <button type="button" className="button button-ghost" onClick={() => handleCopyLink(publicRequestUrl, "request")}>
            Копировать форму
          </button>
          <a href={companyLoginUrl} className="button button-outline">
            Вход компании
          </a>
          <button type="button" className="button button-ghost" onClick={() => handleCopyLink(companyLoginUrl, "login")}>
            Копировать вход
          </button>
          {canOpenCrm ? (
            <button type="button" className="button button-primary" onClick={() => onOpenCompany?.(company.id)}>
              Открыть CRM
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              disabled
              title="Под creator-аккаунтом CRM компании не открывается напрямую. Для операционной работы используй owner или manager логин."
            >
              CRM под директором
            </button>
          )}
        </div>
      </div>
      {copiedLinkType ? (
        <p className="status-note success">
          {copiedLinkType === "login"
            ? "Ссылка на вход скопирована."
            : copiedLinkType === "company"
            ? "Страница компании скопирована."
            : "Ссылка на форму клиента скопирована."}
        </p>
      ) : null}

      <div className="platform-company-preview-grid">
        {quickFacts.map((item) => (
          <article key={item.label} className="platform-company-preview-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      {linkedDemoRequest ? (
        <div className="platform-company-preview-handoff">
          <article className="platform-company-preview-handoff-card">
            <span>Подключение с витрины</span>
            <strong>
              {formatStorefrontPlanLabel(linkedDemoCommerce?.plan)} · {formatDemoBillingPeriod(linkedDemoCommerce?.billing)}
            </strong>
            <p>{linkedDemoRequest.name} · {linkedDemoRequest.phone}</p>
          </article>
          <button
            type="button"
            className="button button-outline"
            onClick={() => onOpenDemoRequest?.(linkedDemoRequest.id, linkedDemoRequest.status || "all")}
          >
            Открыть handoff
          </button>
        </div>
      ) : null}

      <div className="platform-company-preview-ops">
        {operationalNotes.map((item) => (
          <article key={item} className="platform-company-preview-ops-card">
            <strong>Операционный сигнал</strong>
            <p>{item}</p>
          </article>
        ))}
      </div>

      <div className="platform-company-template">
        <div className="platform-company-template-copy">
          <strong>Рабочий шаблон ниши</strong>
          <p>{businessTemplate.summary}</p>
        </div>
        <div className="platform-company-template-list">
          <span>Услуги: {businessTemplate.services.join(" · ")}</span>
          <span>Сценарий: {businessTemplate.workflow}</span>
          <span>Статусы: {businessTemplate.statuses.join(" -> ")}</span>
          <span>Фокус: {businessTemplate.operationsFocus}</span>
        </div>
      </div>

      <div className="platform-company-preview-footer">
        <span>
          Подключена: <strong>{formatDate(company.owner_connected_at || company.created_at)}</strong>
        </span>
        <span>
          Триал до: <strong>{subscription?.trial_ends_at ? formatDate(subscription.trial_ends_at) : "—"}</strong>
        </span>
        <span>
          Продление: <strong>{subscription?.renews_at ? formatDate(subscription.renews_at) : "—"}</strong>
        </span>
      </div>
    </section>
  );
}

function ManagerDashboardPage({ metrics, leads, businessType = "detailing", onOpenLead }) {
  const now = new Date();
  const dashboardCopy = getManagerDashboardCopy(businessType);

  const overdueFollowUps = useMemo(
    () =>
      leads
        .filter((lead) => lead.follow_up_at && !["done", "delivered", "lost"].includes(getLeadStageKey(lead.status)))
        .filter((lead) => getComparableDate(lead.follow_up_at) <= now.getTime())
        .sort((left, right) => getComparableDate(left.follow_up_at) - getComparableDate(right.follow_up_at)),
    [leads, now]
  );

  const freshLeads = useMemo(
    () =>
      leads
        .filter((lead) => getLeadStageKey(lead.status) === "new")
        .sort((left, right) => getComparableDate(right.created_at) - getComparableDate(left.created_at)),
    [leads]
  );

  const todayQueue = useMemo(
    () =>
      leads
        .filter((lead) => {
          if (getLeadStageKey(lead.status) === "in_progress") {
            return true;
          }

          if (lead.follow_up_at && isSameCalendarDay(lead.follow_up_at, now)) {
            return true;
          }

          if (lead.preferred_date) {
            return isSameCalendarDay(`${lead.preferred_date}T00:00:00`, now);
          }

          return false;
        })
        .sort((left, right) => getLeadQueueTime(left) - getLeadQueueTime(right)),
    [leads, now]
  );

  const pipelineSummary = useMemo(
    () => ({
      new: leads.filter((lead) => getLeadStageKey(lead.status) === "new").length,
      in_progress: leads.filter((lead) => getLeadStageKey(lead.status) === "in_progress").length,
      done: leads.filter((lead) => getLeadStageKey(lead.status) === "done").length,
      delivered: leads.filter((lead) => getLeadStageKey(lead.status) === "delivered").length,
      lost: leads.filter((lead) => getLeadStageKey(lead.status) === "lost").length
    }),
    [leads]
  );

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>{dashboardCopy.title}</h1>
          <p>{dashboardCopy.description}</p>
        </div>
        <div className="page-header-actions">
          <NavLink to="/leads" className="button button-primary">
            Открыть заявки
          </NavLink>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard icon="НО" label="Новых заявок" value={metrics.newCount} accent />
        <MetricCard icon="СК" label="Контакты сейчас" value={overdueFollowUps.length} />
        <MetricCard icon="СГ" label="Работа на сегодня" value={todayQueue.length} />
        <MetricCard icon="€" label="Месячная касса" value={formatCurrency(metrics.monthRevenue)} />
      </div>

      <div className="manager-dashboard-grid">
        <section className="surface-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Приоритет</span>
              <h2>Нужно связаться сейчас</h2>
            </div>
          </div>

          <div className="task-list">
            {overdueFollowUps.length ? (
              overdueFollowUps.slice(0, 6).map((lead) => (
                <article key={lead.id} className="task-item">
                  <div className="task-item-main">
                    <MiniIcon label="СК" />
                    <div>
                      <strong>{formatClientName(lead.clients?.name) || "Клиент без имени"}</strong>
                      <span>{formatServiceName(lead.services?.name || "Без услуги")}</span>
                    </div>
                  </div>
                  <div className="task-item-side manager-task-side">
                    <StatusBadge status={lead.status} businessType={businessType} />
                    <small>{formatDate(lead.follow_up_at)}</small>
                    <NavLink to="/leads" className="table-link" onClick={() => onOpenLead(lead.id)}>
                      Открыть
                    </NavLink>
                  </div>
                </article>
              ))
            ) : (
              <div className="table-empty-state">Просроченных контактов сейчас нет. Очередь под контролем.</div>
            )}
          </div>
        </section>

        <section className="surface-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Сегодня</span>
              <h2>{dashboardCopy.queueTitle}</h2>
            </div>
          </div>

          <div className="data-table compact-table">
            <div className="table-head manager-queue-head">
              <span>Клиент</span>
              <span>Услуга</span>
              <span>Когда</span>
              <span>Статус</span>
              <span>Действие</span>
            </div>
            {todayQueue.length ? (
              todayQueue.slice(0, 8).map((lead) => (
                <div key={lead.id} className="table-body-row manager-queue-row">
                  <span className="cell-strong">{formatClientName(lead.clients?.name) || "Без имени"}</span>
                  <span>{formatServiceName(lead.services?.name)}</span>
                  <span>{lead.follow_up_at ? formatDate(lead.follow_up_at) : formatPreferredSlot(lead.preferred_date, lead.preferred_time)}</span>
                  <span>
                    <StatusBadge status={lead.status} businessType={businessType} />
                  </span>
                  <span>
                    <NavLink to="/leads" className="table-link" onClick={() => onOpenLead(lead.id)}>
                      Открыть
                    </NavLink>
                  </span>
                </div>
              ))
            ) : (
              <div className="table-empty-state">{dashboardCopy.queueEmpty}</div>
            )}
          </div>
        </section>
      </div>

      <div className="manager-dashboard-grid">
        <section className="surface-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Входящий поток</span>
              <h2>{dashboardCopy.incomingTitle}</h2>
            </div>
          </div>

          <div className="task-list">
            {freshLeads.length ? (
              freshLeads.slice(0, 6).map((lead) => (
                <article key={lead.id} className="task-item">
                  <div className="task-item-main">
                    <MiniIcon label="НО" />
                    <div>
                      <strong>{formatClientName(lead.clients?.name) || "Клиент без имени"}</strong>
                      <span>{lead.clients?.phone || "Телефон не указан"}</span>
                    </div>
                  </div>
                  <div className="task-item-side manager-task-side">
                    <small>{formatShortDate(lead.created_at)}</small>
                    <span className="amount-cell">{formatCurrency(getLeadAmount(lead))}</span>
                    <NavLink to="/leads" className="table-link" onClick={() => onOpenLead(lead.id)}>
                      Открыть
                    </NavLink>
                  </div>
                </article>
              ))
            ) : (
              <div className="table-empty-state">Новых заявок пока нет.</div>
            )}
          </div>
        </section>

        <section className="surface-card month-summary-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Воронка</span>
              <h2>{dashboardCopy.funnelTitle}</h2>
            </div>
          </div>

          <div className="month-summary-grid">
            <article className="month-summary-stat">
              <strong>{pipelineSummary.new}</strong>
              <span>Новые</span>
            </article>
            <article className="month-summary-stat">
              <strong>{pipelineSummary.in_progress}</strong>
              <span>В работе</span>
            </article>
            <article className="month-summary-stat">
              <strong>{pipelineSummary.done}</strong>
              <span>Готово</span>
            </article>
            <article className="month-summary-stat">
              <strong>{pipelineSummary.delivered}</strong>
              <span>Выдано</span>
            </article>
          </div>

          <div className="manager-summary-foot">
            <div className="manager-summary-line">
              <span>Отменено</span>
              <strong>{pipelineSummary.lost}</strong>
            </div>
            <div className="manager-summary-line">
              <span>Средний чек месяца</span>
              <strong>{formatCurrency(metrics.monthAverageTicket)}</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function DetailerDashboardPage({ metrics, leads, businessType = "detailing", onOpenLead }) {
  const now = new Date();
  const dashboardCopy = getDetailerDashboardCopy(businessType);

  const todayQueue = useMemo(
    () =>
      leads
        .filter((lead) => {
          if (getLeadStageKey(lead.status) === "in_progress") {
            return true;
          }

          if (lead.preferred_date) {
            return isSameCalendarDay(`${lead.preferred_date}T00:00:00`, now);
          }

          return false;
        })
        .sort((left, right) => getLeadQueueTime(left) - getLeadQueueTime(right)),
    [leads, now]
  );

  const activeLeads = useMemo(() => leads.filter((lead) => getLeadStageKey(lead.status) === "in_progress"), [leads]);
  const completedLeads = useMemo(() => leads.filter((lead) => getLeadStageKey(lead.status) === "done"), [leads]);
  const deliveredLeads = useMemo(() => leads.filter((lead) => getLeadStageKey(lead.status) === "delivered"), [leads]);

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>{dashboardCopy.title}</h1>
          <p>{dashboardCopy.description}</p>
        </div>
        <div className="page-header-actions">
          <NavLink to="/leads" className="button button-primary">
            Открыть заявки
          </NavLink>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard icon="НО" label="Новых назначений" value={metrics.newCount} accent />
        <MetricCard icon="ВР" label="Сейчас в работе" value={activeLeads.length} />
        <MetricCard icon="СГ" label="На сегодня" value={todayQueue.length} />
        <MetricCard icon="ГО" label="Готово" value={completedLeads.length} />
        <MetricCard icon="ВД" label="Выдано" value={deliveredLeads.length} />
      </div>

      <div className="manager-dashboard-grid">
        <section className="surface-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Сегодня</span>
              <h2>{dashboardCopy.todayTitle}</h2>
            </div>
          </div>

          <div className="data-table compact-table">
            <div className="table-head manager-queue-head">
              <span>Клиент</span>
              <span>Услуга</span>
              <span>Когда</span>
              <span>Статус</span>
              <span>Действие</span>
            </div>
            {todayQueue.length ? (
              todayQueue.slice(0, 8).map((lead) => (
                <div key={lead.id} className="table-body-row manager-queue-row">
                  <span className="cell-strong">{formatClientName(lead.clients?.name) || "Без имени"}</span>
                  <span>{formatServiceName(lead.services?.name)}</span>
                  <span>{lead.follow_up_at ? formatDate(lead.follow_up_at) : formatPreferredSlot(lead.preferred_date, lead.preferred_time)}</span>
                <span>
                  <StatusBadge status={lead.status} businessType={businessType} />
                </span>
                  <span>
                    <NavLink to="/leads" className="table-link" onClick={() => onOpenLead(lead.id)}>
                      Открыть
                    </NavLink>
                  </span>
                </div>
              ))
            ) : (
              <div className="table-empty-state">{dashboardCopy.todayEmpty}</div>
            )}
          </div>
        </section>

        <section className="surface-card month-summary-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Состояние</span>
              <h2>{dashboardCopy.statusTitle}</h2>
            </div>
          </div>

          <div className="month-summary-grid">
            <article className="month-summary-stat">
              <strong>{metrics.newCount}</strong>
              <span>Новые</span>
            </article>
            <article className="month-summary-stat">
              <strong>{activeLeads.length}</strong>
              <span>В работе</span>
            </article>
            <article className="month-summary-stat">
              <strong>{completedLeads.length}</strong>
              <span>Готово</span>
            </article>
            <article className="month-summary-stat">
              <strong>{deliveredLeads.length}</strong>
              <span>Выдано</span>
            </article>
          </div>

          <div className="manager-summary-foot">
            <div className="manager-summary-line">
              <span>Открытых задач</span>
              <strong>{metrics.openTasks}</strong>
            </div>
            <div className="manager-summary-line">
              <span>Напоминаний</span>
              <strong>{metrics.followUpCount}</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function NewLeadForm({ services, businessType = "detailing", onCreateLead, creatingLead }) {
  const [form, setForm] = useState(() => getInitialLeadForm(services));
  const intakeConfig = publicBusinessTypeIntakeConfig[businessType] || publicBusinessTypeIntakeConfig.detailing;

  useEffect(() => {
    setForm((current) => ({
      ...current,
      service_id: current.service_id || services[0]?.id || ""
    }));
  }, [services]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const created = await onCreateLead(form);
    if (created) {
      setForm(getInitialLeadForm(services));
    }
  }

  return (
    <section className="surface-card">
      <div className="section-title">
        <div>
          <span className="eyebrow">Добавление</span>
          <h2>Новая заявка</h2>
        </div>
      </div>

      <form className="form-grid-shell" onSubmit={handleSubmit}>
        <div className="form-grid two-columns">
          <label>
            Имя клиента
            <input name="client_name" value={form.client_name} onChange={updateField} placeholder="Имя клиента" required />
          </label>
          <label>
            Телефон
            <input name="phone" value={form.phone} onChange={updateField} placeholder="069" required />
          </label>
          <label>
            Услуга
            <select name="service_id" value={form.service_id} onChange={updateField}>
              <option value="">Без услуги</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {formatServiceName(service.name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Источник
            <select name="source" value={form.source} onChange={updateField}>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {formatLabel(source)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Сумма
            <input name="estimated_price" type="number" min="0" value={form.estimated_price} onChange={updateField} placeholder="120" />
          </label>
          <label>
            Дата
            <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
          </label>
          <label>
            Время
            <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder="После 18:00" />
          </label>
          <label>
            Следующий контакт
            <input name="follow_up_at" type="datetime-local" value={form.follow_up_at} onChange={updateField} />
          </label>
          <label>
            Номер авто
            <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder={intakeConfig.platePlaceholder} />
          </label>
          <label>
            Марка
            <input name="car_make" value={form.car_make} onChange={updateField} placeholder={intakeConfig.makePlaceholder} />
          </label>
          <label>
            Модель / год
            <div className="split-input">
              <input name="car_model" value={form.car_model} onChange={updateField} placeholder={intakeConfig.modelPlaceholder} />
              <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder={intakeConfig.yearPlaceholder} />
            </div>
          </label>
        </div>

        <label>
          Комментарий
          <textarea name="comment" value={form.comment} onChange={updateField} rows="4" placeholder={intakeConfig.commentPlaceholder} />
        </label>

        <button type="submit" className="button button-primary" disabled={creatingLead}>
          {creatingLead ? "Создаём..." : "Добавить заявку"}
        </button>
      </form>
    </section>
  );
}

function LeadCard({ lead, isActive, onClick }) {
  return (
    <button type="button" className={isActive ? "lead-kanban-card active" : "lead-kanban-card"} onClick={onClick}>
      <div className="lead-kanban-header">
        <strong>{formatClientName(lead.clients?.name) || "Без имени"}</strong>
        <Avatar name={formatClientName(lead.clients?.name) || "Клиент"} />
      </div>
      <span>{formatServiceName(lead.services?.name || "Услуга не выбрана")}</span>
      <div className="lead-kanban-footer">
        <strong>{formatCurrency(getLeadAmount(lead))}</strong>
        <small>{formatShortDate(lead.created_at)}</small>
      </div>
    </button>
  );
}

function LeadsPage({
  leads,
  leadEvents,
  attachments,
  services,
  businessType = "detailing",
  detailerProfiles,
  currentUserName,
  permissions,
  emptyMessage,
  selectedLeadId,
  setSelectedLeadId,
  createLead,
  creatingLead,
  statusSavingId,
  updateLeadStatus,
  updateLeadAssignee,
  updateLeadPayment,
  updateLeadFollowUp,
  addLeadNote,
  createLeadAttachment,
  updateAttachmentVisibility,
  deleteAttachment,
  onPhoneAction
}) {
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const businessTemplate = getBusinessTypeTemplate(businessType);
  const stageLabels = getStatusGroupLabels(businessType);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return leads;
    }

    return leads.filter((lead) => {
      const haystack = [
        lead.clients?.name,
        lead.clients?.phone,
        lead.services?.name,
        lead.comment,
        lead.car_plate
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [leads, search]);

  const groupedLeads = useMemo(
    () => ({
      new: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "new"),
      in_progress: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "in_progress"),
      done: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "done"),
      delivered: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "delivered"),
      lost: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "lost")
    }),
    [filteredLeads]
  );

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedLeadId) || filteredLeads[0] || null;
  const selectedLeadEvents = useMemo(
    () => leadEvents.filter((event) => event.lead_id === selectedLead?.id),
    [leadEvents, selectedLead?.id]
  );
  const selectedLeadAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.lead_id === selectedLead?.id),
    [attachments, selectedLead?.id]
  );

  useEffect(() => {
    if (!selectedLead && filteredLeads.length > 0) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLead, setSelectedLeadId]);

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Заявки</h1>
          <p>Лента заявок, быстрый выбор клиента и рабочая карточка справа.</p>
        </div>
        <div className="page-header-actions">
          {permissions.canCreateLead ? (
            <button type="button" className="button button-primary" onClick={() => setShowComposer((current) => !current)}>
              {showComposer ? "Скрыть форму" : "Добавить заявку"}
            </button>
          ) : null}
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по клиенту, услуге, номеру"
          />
        </div>
      </div>

      {permissions.canCreateLead && showComposer ? (
        <NewLeadForm services={services} businessType={businessType} onCreateLead={createLead} creatingLead={creatingLead} />
      ) : null}
      {permissions.canCreateLead && !showComposer ? (
        <section className="surface-card compact-note-card composer-hint-card">
          <span className="eyebrow">Быстрый ввод</span>
          <h2>Новая заявка скрыта</h2>
          <p>Откройте форму только когда нужно внести заявку вручную. Так список заявок и рабочая карточка остаются в фокусе во время звонков и обработки входящих обращений.</p>
        </section>
      ) : null}

      <section className="surface-card compact-note-card pipeline-template-card">
        <span className="eyebrow">Рабочий поток ниши</span>
        <h2>{businessTypeLabels[businessType] || "Автосервис"}</h2>
        <p>{businessTemplate.operationsFocus}</p>
        <div className="pipeline-template-row">
          {businessTemplate.statuses.map((status) => (
            <span key={status} className="pipeline-template-chip">
              {status}
            </span>
          ))}
        </div>
      </section>

      {!permissions.canCreateLead ? (
        <section className="surface-card compact-note-card">
          <span className="eyebrow">Роль</span>
          <h2>Операционный доступ</h2>
          <p>Мастер видит только назначенные заявки. Статусы, следующий контакт и внутренние заметки остаются у менеджера и директора.</p>
        </section>
      ) : null}

      <div className="leads-workspace">
        <div className="kanban-grid">
          {["new", "in_progress", "done", "delivered", "lost"].map((columnKey) => (
            <section
              key={columnKey}
              className={
                isStageHighlighted(columnKey)
                  ? `kanban-column stage-${columnKey} active`
                  : `kanban-column stage-${columnKey}`
              }
            >
              <div className="kanban-column-head">
                <strong>{stageLabels[columnKey]}</strong>
                <span>{groupedLeads[columnKey].length}</span>
              </div>
              <div className="kanban-list">
                {groupedLeads[columnKey].length ? (
                  groupedLeads[columnKey].map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isActive={lead.id === selectedLead?.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                    />
                  ))
                ) : (
                  <div className="kanban-empty">{leads.length ? "Нет карточек в этой колонке." : emptyMessage}</div>
                )}
              </div>
            </section>
          ))}
        </div>

        <LeadDetailCard
          lead={selectedLead}
          businessType={businessType}
          leadEvents={selectedLeadEvents}
          attachments={selectedLeadAttachments}
          currentUserName={currentUserName}
          permissions={permissions}
          detailerProfiles={detailerProfiles}
          onPhoneAction={onPhoneAction}
          statusSavingId={statusSavingId}
          updateLeadStatus={updateLeadStatus}
          updateLeadAssignee={updateLeadAssignee}
          updateLeadPayment={updateLeadPayment}
          updateLeadFollowUp={updateLeadFollowUp}
          addLeadNote={addLeadNote}
          addLeadAttachment={createLeadAttachment}
          updateAttachmentVisibility={updateAttachmentVisibility}
          deleteAttachment={deleteAttachment}
        />
      </div>
    </section>
  );
}

function TimelineEvent({ item, currentUserName }) {
  return (
    <article className="timeline-event">
      <span className="timeline-dot" />
      <div className="timeline-content">
        <div className="timeline-meta">
          <strong>{eventLabels[item.type] || item.type}</strong>
          <span>{formatDate(item.created_at)}</span>
        </div>
        <p>{formatEventNote(item.note, item.payload, item.type)}</p>
        <small>{item.created_by ? currentUserName || "Команда" : "Система"}</small>
      </div>
    </article>
  );
}

function LeadDetailCard({
  lead,
  businessType = "detailing",
  leadEvents,
  attachments,
  currentUserName,
  permissions,
  detailerProfiles,
  onPhoneAction,
  statusSavingId,
  updateLeadStatus,
  updateLeadAssignee,
  updateLeadPayment,
  updateLeadFollowUp,
  addLeadNote,
  addLeadAttachment,
  updateAttachmentVisibility,
  deleteAttachment
}) {
  const [note, setNote] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [paymentStatusInput, setPaymentStatusInput] = useState("unpaid");
  const [paymentMethodInput, setPaymentMethodInput] = useState("");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [copiedStatusLink, setCopiedStatusLink] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentVisible, setAttachmentVisible] = useState(true);
  const [attachmentStage, setAttachmentStage] = useState("after");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [savingAttachment, setSavingAttachment] = useState(false);
  const [togglingAttachmentId, setTogglingAttachmentId] = useState(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [advancedStatusInput, setAdvancedStatusInput] = useState("");

  useEffect(() => {
    setNote("");
    setFollowUpInput(formatDateTimeLocal(lead?.follow_up_at));
    setAssigneeInput(lead?.assigned_to || "");
    setPaymentStatusInput(lead?.payment_status || "unpaid");
    setPaymentMethodInput(lead?.payment_method || "");
    setPaidAmountInput(lead?.paid_amount != null && Number(lead?.paid_amount) > 0 ? String(Number(lead.paid_amount)) : "");
    setAttachmentUrl("");
    setAttachmentFile(null);
    setAttachmentVisible(true);
    setAttachmentStage("after");
    setAttachmentInputKey((current) => current + 1);
    setAdvancedStatusInput(
      lead?.status && !compactLeadStageOptions.includes(lead.status)
        ? lead.status
        : ""
    );
  }, [lead]);

  if (!lead) {
    return (
      <section className="surface-card detail-empty-card">
        <h2>Заявка не выбрана</h2>
        <p>Выберите карточку из списка заявок, и здесь откроется полная информация по клиенту и работе.</p>
      </section>
    );
  }

  async function handleFollowUpSubmit(event) {
    event.preventDefault();
    setSavingFollowUp(true);
    try {
      await updateLeadFollowUp(lead, followUpInput);
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleClearFollowUp() {
    setSavingFollowUp(true);
    try {
      setFollowUpInput("");
      await updateLeadFollowUp(lead, "");
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleQuickRepeat(days) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    nextDate.setHours(10, 0, 0, 0);
    const nextInput = formatDateTimeLocal(nextDate.toISOString());

    setSavingFollowUp(true);
    try {
      setFollowUpInput(nextInput);
      await updateLeadFollowUp(lead, nextInput);
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleAddNote(event) {
    event.preventDefault();
    if (!note.trim()) {
      return;
    }

    setSavingNote(true);
    const saved = await addLeadNote(lead.id, note.trim());
    if (saved) {
      setNote("");
    }
    setSavingNote(false);
  }

  async function handleAssigneeSubmit(event) {
    event.preventDefault();
    setSavingAssignee(true);
    try {
      await updateLeadAssignee(lead, assigneeInput || null);
    } finally {
      setSavingAssignee(false);
    }
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    const parsedPaidAmount = parsePaymentAmountInput(paidAmountInput);

    if (Number.isNaN(parsedPaidAmount)) {
      setPaidAmountInput("");
      return;
    }

    setSavingPayment(true);
    try {
      const savedLead = await updateLeadPayment(lead, {
        payment_status: paymentStatusInput,
        payment_method: paymentMethodInput || null,
        paid_amount: parsedPaidAmount
      });
      if (savedLead) {
        setPaymentStatusInput(savedLead.payment_status || "unpaid");
        setPaymentMethodInput(savedLead.payment_method || "");
        setPaidAmountInput(savedLead.paid_amount != null && Number(savedLead.paid_amount) > 0 ? String(Number(savedLead.paid_amount)) : "");
      }
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleAttachmentSubmit(event) {
    event.preventDefault();
    if (!attachmentFile) {
      return;
    }

    setSavingAttachment(true);
    const saved = await addLeadAttachment(lead.id, attachmentFile, attachmentVisible, attachmentStage);

    if (saved) {
      setAttachmentUrl("");
      setAttachmentFile(null);
      setAttachmentVisible(true);
      setAttachmentStage("after");
      setAttachmentInputKey((current) => current + 1);
    }
    setSavingAttachment(false);
  }

  async function handleToggleAttachment(attachmentId, nextVisible) {
    setTogglingAttachmentId(attachmentId);
    await updateAttachmentVisibility(attachmentId, nextVisible);
    setTogglingAttachmentId(null);
  }

  async function handleDeleteAttachment(attachmentId) {
    setDeletingAttachmentId(attachmentId);
    await deleteAttachment(attachmentId);
    setDeletingAttachmentId(null);
  }

  async function handleCopyStatusLink() {
    if (!lead?.public_status_token) {
      return;
    }

    const statusUrl = `${window.location.origin}/status/${lead.public_status_token}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(statusUrl);
      }
      setCopiedStatusLink(true);
      window.setTimeout(() => setCopiedStatusLink(false), 2200);
    } catch {
      setCopiedStatusLink(false);
    }
  }

  const noteEvents = leadEvents.filter((eventItem) => eventItem.type === "note_added");
  const assignedDetailer = (detailerProfiles || []).find((member) => member.id === lead.assigned_to) || null;
  const totalAmount = getLeadAmount(lead);
  const paidAmount = getLeadPaidAmount(lead);
  const outstandingAmount = getLeadOutstandingAmount(lead);
  const currentStageKey = getLeadStageKey(lead.status);
  const primaryStageLabels = getStatusGroupLabels(businessType);
  const detailedStatusOptions = getDetailedStatusOptions(businessType);

  function getPrimaryStageStatus(stageKey) {
    if (stageKey === "new") {
      return "new";
    }

    if (stageKey === "done") {
      return "done";
    }

    if (stageKey === "delivered") {
      return "delivered";
    }

    if (stageKey === "lost") {
      return "lost";
    }

    return "in_progress";
  }
  const businessTemplate = getBusinessTypeTemplate(businessType);
  const stageGuidance = getBusinessTypeStageGuidance(businessType, lead.status);
  const statusControls = permissions.canEditLead ? (
    <div className="lead-status-controls">
      <div className="status-primary-row">
        {compactLeadStageOptions.map((stageKey) => (
          <button
            key={stageKey}
            type="button"
            className={currentStageKey === stageKey ? "status-chip active" : "status-chip"}
            disabled={statusSavingId === lead.id}
            onClick={() => updateLeadStatus(lead.id, getPrimaryStageStatus(stageKey))}
          >
            {statusSavingId === lead.id && currentStageKey === stageKey
              ? "Сохраняем..."
              : primaryStageLabels[stageKey]}
          </button>
        ))}
      </div>

      <div className="status-advanced-row">
        <span>Детальный этап</span>
        <select value={advancedStatusInput} onChange={(event) => setAdvancedStatusInput(event.target.value)}>
          <option value="">Не выбран</option>
          {detailedStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button button-outline"
          disabled={!advancedStatusInput || statusSavingId === lead.id}
          onClick={() => updateLeadStatus(lead.id, advancedStatusInput)}
        >
          Применить этап
        </button>
      </div>
    </div>
  ) : null;

  return (
    <section className="surface-card detail-card">
      <div className="client-hero">
        <div className="client-hero-main">
          <Avatar name={formatClientName(lead.clients?.name)} large />
          <div>
            <span className="eyebrow">Карточка заявки</span>
            <h2>{formatClientName(lead.clients?.name) || "Клиент без имени"}</h2>
            <p>{lead.clients?.phone || "Без телефона"}</p>
          </div>
        </div>

        <div className="client-hero-actions">
          <button type="button" className="button button-outline" onClick={() => onPhoneAction?.(lead.clients?.phone)}>
            Позвонить
          </button>
          <a
            className="button button-outline"
            href={lead.clients?.phone ? getWhatsAppUrl(lead.clients.phone) : "#"}
            target="_blank"
            rel="noreferrer"
          >
            Написать
          </a>
          <StatusBadge status={lead.status} businessType={businessType} />
        </div>
      </div>

      {statusControls}

      <div className="detail-grid">
        <div className="detail-card-item">
          <span>Услуга</span>
          <strong>{formatServiceName(lead.services?.name)}</strong>
        </div>
        <div className="detail-card-item">
          <span>Сумма</span>
          <strong>{formatCurrency(getLeadAmount(lead))}</strong>
        </div>
        <div className="detail-card-item">
          <span>Оплата</span>
          <strong>{paymentStatusLabels[lead.payment_status] || "Не оплачено"}</strong>
        </div>
        <div className="detail-card-item">
          <span>Оплачено</span>
          <strong>{formatCurrency(getLeadPaidAmount(lead))}</strong>
        </div>
        <div className="detail-card-item">
          <span>Остаток</span>
          <strong>{formatCurrency(getLeadOutstandingAmount(lead))}</strong>
        </div>
        <div className="detail-card-item">
          <span>Автомобиль</span>
          <strong>{[lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ") || "Не указан"}</strong>
        </div>
        <div className="detail-card-item">
          <span>Источник</span>
          <strong>{formatLabel(lead.source)}</strong>
        </div>
        <div className="detail-card-item">
          <span>Желаемое время клиента</span>
          <strong>{formatPreferredSlot(lead.preferred_date, lead.preferred_time)}</strong>
        </div>
        <div className="detail-card-item">
          <span>Следующий контакт</span>
          <strong>{lead.follow_up_at ? formatDate(lead.follow_up_at) : "Не назначен"}</strong>
        </div>
        <div className="detail-card-item">
          <span>Мастер</span>
          <strong>{assignedDetailer ? formatTeamMemberLabel(assignedDetailer, "Не назначен") : "Не назначен"}</strong>
        </div>
      </div>

      <div className="detail-stack">
        {permissions.canEditLead ? (
          <div className="detail-card-item block">
            <span>Назначение мастера</span>
            <form className="followup-form" onSubmit={handleAssigneeSubmit}>
              <select value={assigneeInput} onChange={(event) => setAssigneeInput(event.target.value)}>
                <option value="">Не назначен</option>
                {(detailerProfiles || []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {formatTeamMemberLabel(member, "Мастер")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="button button-primary"
                disabled={savingAssignee || assigneeInput === (lead.assigned_to || "")}
              >
                {savingAssignee ? "Сохраняем..." : "Сохранить мастера"}
              </button>
            </form>
          </div>
        ) : null}

        <div className="detail-card-item block">
          <span>Рекомендуемый поток</span>
          <p>{businessTemplate.workflow}</p>
          <div className="pipeline-template-row">
            {businessTemplate.statuses.map((status) => (
              <span key={status} className="pipeline-template-chip">
                {status}
              </span>
            ))}
          </div>
          <div className="pipeline-guidance-box">
            <div className="pipeline-guidance-item">
              <small>Сейчас</small>
              <strong>{stageGuidance.now}</strong>
            </div>
            <div className="pipeline-guidance-item">
              <small>Следующий шаг</small>
              <strong>{stageGuidance.next}</strong>
            </div>
          </div>
        </div>

        {permissions.canEditLead ? (
          <div className="detail-card-item block">
            <span>Оплата по заявке: предоплата и остаток</span>
            <div className="payment-snapshot-grid">
              <div className="payment-snapshot-item">
                <small>Всего</small>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
              <div className="payment-snapshot-item">
                <small>Внесено</small>
                <strong>{formatCurrency(paidAmount)}</strong>
              </div>
              <div className="payment-snapshot-item">
                <small>Остаток</small>
                <strong>{formatCurrency(outstandingAmount)}</strong>
              </div>
              <div className="payment-snapshot-item">
                <small>Статус</small>
                <strong>{paymentStatusLabels[lead.payment_status] || "Не оплачено"}</strong>
              </div>
            </div>
            <form className="followup-form payment-form" onSubmit={handlePaymentSubmit}>
              <select
                value={paymentStatusInput}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setPaymentStatusInput(nextValue);
                  if (nextValue === "unpaid") {
                    setPaidAmountInput("");
                  } else if (nextValue === "paid" && totalAmount > 0) {
                    setPaidAmountInput(String(totalAmount));
                  }
                }}
              >
                {paymentStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {paymentStatusLabels[option]}
                  </option>
                ))}
              </select>
              <select value={paymentMethodInput} onChange={(event) => setPaymentMethodInput(event.target.value)}>
                <option value="">Способ оплаты</option>
                {paymentMethodOptions.map((option) => (
                  <option key={option} value={option}>
                    {paymentMethodLabels[option]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                value={paidAmountInput}
                onChange={(event) => setPaidAmountInput(event.target.value)}
                placeholder={`Сколько уже оплачено, например ${totalAmount}`}
              />
              <button type="submit" className="button button-primary" disabled={savingPayment}>
                {savingPayment ? "Сохраняем..." : "Сохранить оплату"}
              </button>
            </form>
            <p>
              {lead.paid_at ? `Оплата отмечена ${formatDate(lead.paid_at)}.` : "Оплата ещё не отмечена."}
              {lead.payment_method ? ` Способ: ${paymentMethodLabels[lead.payment_method] || lead.payment_method}.` : ""}
              {` Остаток: ${formatCurrency(outstandingAmount)}.`}
            </p>
          </div>
        ) : null}

        {lead.public_status_token ? (
          <div className="detail-card-item block">
            <span>Ссылка для клиента</span>
            <div className="public-status-link-row">
              <input readOnly value={`${window.location.origin}/status/${lead.public_status_token}`} />
              <button type="button" className="button button-outline" onClick={handleCopyStatusLink}>
                {copiedStatusLink ? "Скопировано" : "Копировать"}
              </button>
            </div>
          </div>
        ) : null}

        {lead.address ? (
          <div className="detail-card-item block">
            <span>Адрес</span>
            <p>{lead.address}</p>
          </div>
        ) : null}

        <div className="detail-card-item block">
          <span>Комментарий клиента</span>
          <p>{lead.comment || "Комментарий не добавлен."}</p>
        </div>

        <div className="detail-card-item block">
          <span>Фото по заявке</span>
          {permissions.canEditLead ? (
            <form className="attachment-form" onSubmit={handleAttachmentSubmit}>
              <label className="attachment-upload-field">
                <span>Файл изображения</span>
                <input
                  key={attachmentInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    setAttachmentFile(nextFile);
                    setAttachmentUrl(nextFile?.name || "");
                  }}
                />
              </label>
              {attachmentUrl ? <div className="hint-text">Выбрано: {attachmentUrl}</div> : null}
              <label>
                Этап фото
                <select value={attachmentStage} onChange={(event) => setAttachmentStage(event.target.value)}>
                  <option value="before">До</option>
                  <option value="after">После</option>
                </select>
              </label>
              <label className="settings-checkbox">
                <input type="checkbox" checked={attachmentVisible} onChange={(event) => setAttachmentVisible(event.target.checked)} />
                <span>Показывать клиенту на странице статуса</span>
              </label>
              <button type="submit" className="button button-primary" disabled={savingAttachment || !attachmentFile}>
                {savingAttachment ? "Добавляем..." : "Добавить фото"}
              </button>
            </form>
          ) : null}

          {attachments.length ? (
            <div className="attachment-grid">
              {attachments.map((attachment) => (
                <article key={attachment.id} className="attachment-card">
                  <a href={attachment.file_url} target="_blank" rel="noreferrer" className="attachment-preview">
                    <img src={attachment.file_url} alt="Фото по заявке" className="attachment-image" />
                  </a>
                  <div className="attachment-meta">
                    <strong>{photoStageLabels[attachment.photo_stage || "after"] || "После"}</strong>
                    <small>{formatDate(attachment.created_at)}</small>
                    <span className={attachment.is_customer_visible ? "attachment-chip active" : "attachment-chip"}>
                      {attachment.is_customer_visible ? "Видно клиенту" : "Только для команды"}
                    </span>
                  </div>
                  {permissions.canEditLead ? (
                    <div className="attachment-actions">
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={togglingAttachmentId === attachment.id}
                        onClick={() => handleToggleAttachment(attachment.id, !attachment.is_customer_visible)}
                      >
                        {togglingAttachmentId === attachment.id
                          ? "Сохраняем..."
                          : attachment.is_customer_visible
                            ? "Скрыть от клиента"
                            : "Показать клиенту"}
                      </button>
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={deletingAttachmentId === attachment.id}
                        onClick={() => handleDeleteAttachment(attachment.id)}
                      >
                        {deletingAttachmentId === attachment.id ? "Удаляем..." : "Удалить"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="timeline-empty">Фото по этой заявке пока не добавлены.</div>
          )}
        </div>
      </div>

      <div className="detail-tabs">
        <button type="button" className="tab-button active">
          История
        </button>
        <button type="button" className="tab-button">
          Заметки
        </button>
      </div>

      {permissions.canEditLead ? (
        <div className="followup-toolbar">
          <form className="followup-form" onSubmit={handleFollowUpSubmit}>
            <input type="datetime-local" value={followUpInput} onChange={(event) => setFollowUpInput(event.target.value)} />
            <button type="submit" className="button button-primary" disabled={savingFollowUp}>
              {savingFollowUp ? "Сохраняем..." : "Сохранить следующий контакт"}
            </button>
            <button
              type="button"
              className="button button-outline"
              disabled={savingFollowUp || (!lead.follow_up_at && !followUpInput)}
              onClick={handleClearFollowUp}
            >
              Очистить
            </button>
          </form>
          <div className="repeat-visit-row">
            <span>Повторный визит:</span>
            {[30, 60, 90].map((days) => (
              <button key={days} type="button" className="button button-outline" disabled={savingFollowUp} onClick={() => handleQuickRepeat(days)}>
                Через {days} дней
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="hint-text">У мастера только просмотр. Статус, следующий контакт и заметки изменяются менеджером или директором.</p>
      )}

      {permissions.canEditLead ? (
        <form className="note-composer" onSubmit={handleAddNote}>
          <label>
            Внутренняя заметка
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="Позвонили клиенту, ждём подтверждение..." />
          </label>
          <button type="submit" className="button button-primary" disabled={savingNote}>
            {savingNote ? "Сохраняем..." : "Добавить заметку"}
          </button>
        </form>
      ) : null}

      <div className="timeline-shell">
        <div className="timeline-column">
          {leadEvents.length ? (
            leadEvents.map((item) => <TimelineEvent key={item.id} item={item} currentUserName={currentUserName} />)
          ) : (
            <div className="timeline-empty">История появится здесь после первых изменений по заявке.</div>
          )}
        </div>

        <aside className="notes-sidebar">
          <div className="notes-sidebar-head">
            <strong>Заметки</strong>
            <span>{noteEvents.length}</span>
          </div>
          {noteEvents.length ? (
            noteEvents.map((item) => (
              <article key={item.id} className="note-card">
                <p>{item.note}</p>
                <small>{formatDate(item.created_at)}</small>
              </article>
            ))
          ) : (
            <div className="notes-empty">Пока нет внутренних заметок.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

function ClientsPage({ clients, leads, leadEvents, businessType = "detailing", onPhoneAction }) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || null);
  const [activeTab, setActiveTab] = useState("history");
  const pageCopy = getClientsPageCopy(businessType);

  useEffect(() => {
    if (!selectedClientId && clients[0]?.id) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) || clients[0] || null;
  const clientLeads = useMemo(
    () => leads.filter((lead) => lead.client_id === selectedClient?.id),
    [leads, selectedClient?.id]
  );
  const clientLeadIds = useMemo(() => new Set(clientLeads.map((lead) => lead.id)), [clientLeads]);
  const clientEvents = useMemo(
    () => leadEvents.filter((eventItem) => clientLeadIds.has(eventItem.lead_id)),
    [leadEvents, clientLeadIds]
  );
  const clientNotes = clientEvents.filter((item) => item.type === "note_added");

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.description}</p>
        </div>
      </div>

      <div className="clients-layout">
        <section className="surface-card client-list-card">
          <div className="section-title compact">
            <h2>{pageCopy.listTitle}</h2>
          </div>
          <div className="client-list">
            {clients.map((client) => (
              <button
                type="button"
                key={client.id}
                className={client.id === selectedClient?.id ? "client-list-item active" : "client-list-item"}
                onClick={() => setSelectedClientId(client.id)}
              >
                <Avatar name={formatClientName(client.name)} />
                <div>
                  <strong>{formatClientName(client.name)}</strong>
                  <span>{client.phone}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card client-detail-card">
          {selectedClient ? (
            <>
              <div className="client-hero">
                <div className="client-hero-main">
                  <Avatar name={formatClientName(selectedClient.name)} large />
                  <div>
                    <span className="eyebrow">{pageCopy.cardTitle}</span>
                    <h2>{formatClientName(selectedClient.name)}</h2>
                    <p>{selectedClient.phone || "Телефон не указан"}</p>
                  </div>
                </div>
                <div className="client-hero-actions">
                  <button type="button" className="button button-outline" onClick={() => onPhoneAction?.(selectedClient.phone)}>
                    Позвонить
                  </button>
                  <a
                    className="button button-outline"
                    href={selectedClient.phone ? getWhatsAppUrl(selectedClient.phone) : "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Написать
                  </a>
                  <NavLink to="/leads" className="button button-primary">
                    Новая заявка
                  </NavLink>
                </div>
              </div>

              <div className="detail-tabs">
                {clientTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "tab-button active" : "tab-button"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "history" ? "История" : tab === "leads" ? "Заявки" : "Заметки"}
                  </button>
                ))}
              </div>

              {activeTab === "history" ? (
                <div className="timeline-column">
                  {clientEvents.length ? (
                    clientEvents.map((item) => <TimelineEvent key={item.id} item={item} currentUserName="Команда" />)
                  ) : (
                    <div className="timeline-empty">{pageCopy.emptyHistory}</div>
                  )}
                </div>
              ) : null}

              {activeTab === "leads" ? (
                <div className="data-table compact-table">
                  <div className="table-head">
                    <span>Заявка</span>
                    <span>Услуга</span>
                    <span>Статус</span>
                    <span>Дата</span>
                    <span>Сумма</span>
                    <span>Действие</span>
                  </div>
                  {clientLeads.length ? (
                    clientLeads.map((lead) => (
                      <div key={lead.id} className="table-body-row">
                        <span className="cell-strong">{formatClientName(selectedClient.name)}</span>
                        <span>{formatServiceName(lead.services?.name)}</span>
                        <span>
                          <StatusBadge status={lead.status} businessType={businessType} />
                        </span>
                        <span>{formatShortDate(lead.created_at)}</span>
                        <span className="amount-cell">{formatCurrency(getLeadAmount(lead))}</span>
                        <span>
                          <NavLink to="/leads" className="table-link">
                            Открыть
                          </NavLink>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="table-empty-state">{pageCopy.emptyLeads}</div>
                  )}
                </div>
              ) : null}

              {activeTab === "notes" ? (
                <div className="notes-grid">
                  {clientNotes.length ? (
                    clientNotes.map((item) => (
                      <article key={item.id} className="note-card">
                        <p>{item.note}</p>
                        <small>{formatDate(item.created_at)}</small>
                      </article>
                    ))
                  ) : (
                    <div className="notes-empty">Внутренних заметок по клиенту пока нет.</div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="table-empty-state">Клиенты пока не загружены.</div>
          )}
        </section>
      </div>
    </section>
  );
}

function TasksPage({ leads, businessType = "detailing" }) {
  const pageCopy = getTasksPageCopy(businessType);
  const tasks = useMemo(
    () =>
      leads
        .filter((lead) => lead.follow_up_at || getLeadStageKey(lead.status) === "in_progress")
        .sort((left, right) => new Date(left.follow_up_at || left.created_at) - new Date(right.follow_up_at || right.created_at)),
    [leads]
  );

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.description}</p>
        </div>
      </div>

      <section className="surface-card">
        <div className="task-list">
          {tasks.length ? (
            tasks.map((lead) => (
              <article key={lead.id} className="task-item">
                <div className="task-item-main">
                  <MiniIcon label="TK" />
                  <div>
                    <strong>{lead.clients?.name || "Клиент без имени"}</strong>
                    <span>{formatServiceName(lead.services?.name || "Без услуги")}</span>
                  </div>
                </div>
                <div className="task-item-side">
                  <StatusBadge status={lead.status} businessType={businessType} />
                  <small>{lead.follow_up_at ? formatDate(lead.follow_up_at) : formatDate(lead.created_at)}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="table-empty-state">{pageCopy.empty}</div>
          )}
        </div>
      </section>
    </section>
  );
}

function ServicesPage({ services }) {
  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Услуги</h1>
          <p>Каталог услуг с базовой стоимостью и длительностью для менеджера.</p>
        </div>
      </div>

      <div className="service-grid">
        {services.map((service) => (
          <article key={service.id} className="surface-card service-card">
            <MiniIcon label="SR" />
            <strong>{formatServiceName(service.name)}</strong>
            <span>{formatCurrency(service.base_price)}</span>
            <p>{service.duration_minutes} мин.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LiveSettingsPage({
  webhookEnabled,
  role,
  profile,
  currentCompany,
  teamProfiles,
  services,
  profileSaving,
  companySaving,
  teamSaving,
  serviceSavingId,
  creatingTeamMember,
  creatingService,
  applyingDemoPricing,
  passwordSaving,
  onSaveProfile,
  onSaveCompany,
  onUpdateTeamMember,
  onDeleteTeamMember,
  onCreateTeamMember,
  onUpdateService,
  onCreateService,
  onApplyDemoPricing,
  onChangePassword
}) {
  const [activeSection, setActiveSection] = useState("profile");
  const [profileForm, setProfileForm] = useState({ full_name: "", telegram_chat_id: "" });
  const [companyForm, setCompanyForm] = useState({
    name: "",
    slug: "",
    business_type: "detailing",
    contact_phone: "",
    contact_email: "",
    plan_code: "starter",
    status: "active"
  });
  const [draftProfiles, setDraftProfiles] = useState({});
  const [newTeamMember, setNewTeamMember] = useState({ full_name: "", email: "", password: "", role: "manager", telegram_chat_id: "" });
  const [draftServices, setDraftServices] = useState({});
  const [newService, setNewService] = useState({ name: "", base_price: "", duration_minutes: "", is_active: true });
  const [passwordForm, setPasswordForm] = useState({ next: "", confirm: "" });
  const companyTemplate = businessTypeTemplateContent[companyForm.business_type] || businessTypeTemplateContent.detailing;

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name || "",
      telegram_chat_id: profile?.telegram_chat_id || ""
    });
  }, [profile?.full_name, profile?.telegram_chat_id]);

  useEffect(() => {
    setCompanyForm({
      name: currentCompany?.name || "",
      slug: currentCompany?.slug || "",
      business_type: currentCompany?.business_type || "detailing",
      contact_phone: currentCompany?.contact_phone || "",
      contact_email: currentCompany?.contact_email || "",
      plan_code: currentCompany?.plan_code || "starter",
      status: currentCompany?.status || "active"
    });
  }, [
    currentCompany?.name,
    currentCompany?.slug,
    currentCompany?.business_type,
    currentCompany?.contact_phone,
    currentCompany?.contact_email,
    currentCompany?.plan_code,
    currentCompany?.status
  ]);

  useEffect(() => {
    setDraftProfiles(
      Object.fromEntries(
        (teamProfiles || []).map((member) => [
          member.id,
          {
            full_name: member.full_name || "",
            role: member.role || "manager",
            telegram_chat_id: member.telegram_chat_id || ""
          }
        ])
      )
    );
  }, [teamProfiles]);

  useEffect(() => {
    setDraftServices(
      Object.fromEntries(
        (services || []).map((service) => [
          service.id,
          {
            name: formatServiceName(service.name || ""),
            base_price: service.base_price ?? "",
            duration_minutes: service.duration_minutes ?? "",
            is_active: service.is_active !== false
          }
        ])
      )
    );
  }, [services]);

  const managerProfiles = (teamProfiles || []).filter((member) => member.role === "manager");

  async function handleProfileSubmit(event) {
    event.preventDefault();
    await onSaveProfile(profileForm);
  }

  async function handleCreateTeamMember(event) {
    event.preventDefault();
    const created = await onCreateTeamMember(newTeamMember);
    if (created) {
      setNewTeamMember({ full_name: "", email: "", password: "", role: "manager", telegram_chat_id: "" });
    }
  }

  async function handleCreateService(event) {
    event.preventDefault();
    const created = await onCreateService(newService);
    if (created) {
      setNewService({ name: "", base_price: "", duration_minutes: "", is_active: true });
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (!passwordForm.next || passwordForm.next !== passwordForm.confirm) {
      return;
    }

    const changed = await onChangePassword(passwordForm.next);
    if (changed) {
      setPasswordForm({ next: "", confirm: "" });
    }
  }

  async function handleCompanySubmit(event) {
    event.preventDefault();
    await onSaveCompany(companyForm);
  }

  function renderSection() {
    if (activeSection === "profile") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>{"Профиль"}</strong>
            <form className="settings-edit-form" onSubmit={handleProfileSubmit}>
              <label>
                {"Имя в системе"}
                <input
                  value={profileForm.full_name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
                  placeholder={"Имя владельца или менеджера"}
                />
              </label>
              <label>
                Номер чата в Телеграм
                <input
                  value={profileForm.telegram_chat_id}
                  onChange={(event) => setProfileForm((current) => ({ ...current, telegram_chat_id: event.target.value }))}
                  placeholder={"Для личных уведомлений"}
                />
              </label>
              <div className="settings-action-row">
                <span className="hint-text">{"Текущая роль:"} {roleLabels[role] || roleLabels.manager}</span>
                <button type="submit" className="button button-primary" disabled={profileSaving}>
                  {profileSaving ? "Сохраняем..." : "Сохранить профиль"}
                </button>
              </div>
            </form>
          </article>
        </div>
      );
    }

    if (activeSection === "team") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <div className="settings-toolbar-card">
              <div>
                <strong>{"Команда"}</strong>
                <p>{"Меняйте имя, роль и Телеграм для директора, менеджера и мастера."}</p>
              </div>
            </div>
            <div className="service-grid settings-service-grid">
              {(teamProfiles || []).map((member) => {
                const draft = draftProfiles[member.id] || {
                  full_name: member.full_name || "",
                  role: member.role || "manager",
                  telegram_chat_id: member.telegram_chat_id || ""
                };

                return (
                  <article key={member.id} className="service-card">
                    <div className="service-card-head">
                      <strong>{member.full_name || "Участник"}</strong>
                      <span>{roleLabels[member.role] || "Сотрудник"}</span>
                    </div>
                    <div className="settings-edit-form">
                      <label>
                        {"Имя"}
                        <input
                          value={draft.full_name}
                          onChange={(event) =>
                            setDraftProfiles((current) => ({
                              ...current,
                              [member.id]: { ...draft, full_name: event.target.value }
                            }))
                          }
                        />
                      </label>
                      <label>
                        {"Роль"}
                        <select
                          value={draft.role}
                          onChange={(event) =>
                            setDraftProfiles((current) => ({
                              ...current,
                              [member.id]: { ...draft, role: event.target.value }
                            }))
                          }
                        >
                          {roleOptions.map((option) => (
                            <option key={option} value={option}>
                              {roleLabels[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Номер чата в Телеграм
                        <input
                          value={draft.telegram_chat_id}
                          onChange={(event) =>
                            setDraftProfiles((current) => ({
                              ...current,
                              [member.id]: { ...draft, telegram_chat_id: event.target.value }
                            }))
                          }
                        />
                      </label>
                      <div className="settings-action-row">
                        <button type="button" className="button button-primary" disabled={teamSaving} onClick={() => onUpdateTeamMember(member.id, draft)}>
                          {teamSaving ? "Сохраняем..." : "Сохранить"}
                        </button>
                        {profile?.id !== member.id ? (
                          <button type="button" className="button button-outline" disabled={teamSaving} onClick={() => onDeleteTeamMember(member.id)}>
                            {"Удалить"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="settings-form-card">
            <strong>{"Добавить участника"}</strong>
            <form className="settings-edit-form" onSubmit={handleCreateTeamMember}>
              <label>
                {"Имя"}
                <input value={newTeamMember.full_name} onChange={(event) => setNewTeamMember((current) => ({ ...current, full_name: event.target.value }))} />
              </label>
              <label>
                Почта
                <input type="email" value={newTeamMember.email} onChange={(event) => setNewTeamMember((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                {"Временный пароль"}
                <input type="password" value={newTeamMember.password} onChange={(event) => setNewTeamMember((current) => ({ ...current, password: event.target.value }))} />
              </label>
              <label>
                {"Роль"}
                <select value={newTeamMember.role} onChange={(event) => setNewTeamMember((current) => ({ ...current, role: event.target.value }))}>
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {roleLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Номер чата в Телеграм
                <input value={newTeamMember.telegram_chat_id} onChange={(event) => setNewTeamMember((current) => ({ ...current, telegram_chat_id: event.target.value }))} />
              </label>
              <button type="submit" className="button button-primary" disabled={creatingTeamMember}>
                {creatingTeamMember ? "Создаём..." : "Создать аккаунт"}
              </button>
            </form>
          </article>
        </div>
      );
    }

    if (activeSection === "company") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>Компания</strong>
            <div className="settings-company-summary">
              <span className="settings-company-chip">{businessTypeLabels[companyForm.business_type] || "Автосервис"}</span>
              <span className="settings-company-chip">{planLabels[companyForm.plan_code] || "Start"}</span>
              <span className="settings-company-chip">slug: {companyForm.slug || "не задан"}</span>
            </div>
            <div className="settings-company-template">
              <strong>Шаблон ниши</strong>
              <p>{companyTemplate.summary}</p>
              <div className="settings-company-template-row">
                <span>Типовые услуги:</span>
                <strong>{companyTemplate.services.join(" · ")}</strong>
              </div>
              <div className="settings-company-template-row">
                <span>Базовый сценарий:</span>
                <strong>{companyTemplate.workflow}</strong>
              </div>
              <div className="settings-company-template-row">
                <span>Рекомендуемые статусы:</span>
                <strong>{companyTemplate.statuses.join(" -> ")}</strong>
              </div>
              <div className="settings-company-template-row">
                <span>Операционный акцент:</span>
                <strong>{companyTemplate.operationsFocus}</strong>
              </div>
            </div>
            <form className="settings-edit-form" onSubmit={handleCompanySubmit}>
              <label>
                Название компании
                <input
                  value={companyForm.name}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Название центра"
                />
              </label>
              <label>
                Код компании
                <input
                  value={companyForm.slug}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="например: код-компании"
                />
              </label>
              <label>
                Тип бизнеса
                <select
                  value={companyForm.business_type}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, business_type: event.target.value }))}
                >
                  <option value="detailing">Детейлинг</option>
                  <option value="car_wash">Автомойка</option>
                  <option value="tire_service">Шиномонтаж</option>
                  <option value="auto_service">Автосервис</option>
                </select>
              </label>
              <label>
                Телефон компании
                <input
                  value={companyForm.contact_phone}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, contact_phone: event.target.value }))}
                  placeholder="+373..."
                />
              </label>
              <label>
                Почта компании
                <input
                  type="email"
                  value={companyForm.contact_email}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, contact_email: event.target.value }))}
                  placeholder="почта@центр.md"
                />
              </label>
              <label>
                Пакет
                <select
                  value={companyForm.plan_code}
                  onChange={(event) => setCompanyForm((current) => ({ ...current, plan_code: event.target.value }))}
                >
                  <option value="starter">Старт</option>
                  <option value="pro">Про</option>
                  <option value="studio">Студия</option>
                </select>
              </label>
              <div className="settings-action-row">
                <span className="hint-text">Статус: {companyForm.status === "active" ? "Активна" : companyForm.status}</span>
                <button type="submit" className="button button-primary" disabled={companySaving}>
                  {companySaving ? "Сохраняем..." : "Сохранить компанию"}
                </button>
              </div>
            </form>
          </article>
        </div>
      );
    }

    if (activeSection === "billing") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <div className="settings-toolbar-card">
              <div>
                <strong>{"Демо-прайс"}</strong>
                <p>{`Подтягиваем услуги, цены и время под нишу "${businessTypeLabels[currentCompany?.business_type] || "Детейлинг"}", чтобы CRM сразу выглядела как рабочая для этого бизнеса.`}</p>
              </div>
              <button type="button" className="button button-primary" disabled={applyingDemoPricing} onClick={onApplyDemoPricing}>
                {applyingDemoPricing ? "Обновляем..." : "Загрузить услуги по нише"}
              </button>
            </div>
          </article>

          <article className="settings-form-card">
            <strong>{"Услуги"}</strong>
            <div className="service-grid settings-service-grid">
              {(services || []).map((service) => {
                const draft = draftServices[service.id] || {
                  name: formatServiceName(service.name || ""),
                  base_price: service.base_price ?? "",
                  duration_minutes: service.duration_minutes ?? "",
                  is_active: service.is_active !== false
                };

                return (
                  <article key={service.id} className="service-card">
                    <div className="settings-edit-form">
                      <label>
                        {"Название"}
                        <input value={draft.name} onChange={(event) => setDraftServices((current) => ({ ...current, [service.id]: { ...draft, name: event.target.value } }))} />
                      </label>
                      <label>
                        {"Цена (MDL)"}
                        <input type="number" min="0" value={draft.base_price} onChange={(event) => setDraftServices((current) => ({ ...current, [service.id]: { ...draft, base_price: event.target.value } }))} />
                      </label>
                      <label>
                        {"Длительность (мин)"}
                        <input type="number" min="0" value={draft.duration_minutes} onChange={(event) => setDraftServices((current) => ({ ...current, [service.id]: { ...draft, duration_minutes: event.target.value } }))} />
                      </label>
                      <label className="settings-checkbox">
                        <input type="checkbox" checked={draft.is_active} onChange={(event) => setDraftServices((current) => ({ ...current, [service.id]: { ...draft, is_active: event.target.checked } }))} />
                        <span>{"Активная услуга"}</span>
                      </label>
                      <button type="button" className="button button-primary" disabled={serviceSavingId === service.id} onClick={() => onUpdateService(service.id, draft)}>
                        {serviceSavingId === service.id ? "Сохраняем..." : "Сохранить услугу"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="settings-form-card">
            <strong>{"Новая услуга"}</strong>
            <form className="settings-edit-form" onSubmit={handleCreateService}>
              <label>
                {"Название"}
                <input value={newService.name} onChange={(event) => setNewService((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                {"Цена (MDL)"}
                <input type="number" min="0" value={newService.base_price} onChange={(event) => setNewService((current) => ({ ...current, base_price: event.target.value }))} />
              </label>
              <label>
                {"Длительность (мин)"}
                <input type="number" min="0" value={newService.duration_minutes} onChange={(event) => setNewService((current) => ({ ...current, duration_minutes: event.target.value }))} />
              </label>
              <label className="settings-checkbox">
                <input type="checkbox" checked={newService.is_active} onChange={(event) => setNewService((current) => ({ ...current, is_active: event.target.checked }))} />
                <span>{"Сразу активировать"}</span>
              </label>
              <button type="submit" className="button button-primary" disabled={creatingService}>
                {creatingService ? "Создаём..." : "Добавить услугу"}
              </button>
            </form>
          </article>
        </div>
      );
    }

    if (activeSection === "integrations") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>Автоматизация</strong>
            <p>
              {webhookEnabled
                ? "Внешняя автоматизация включена. Система отправляет события по заявкам в слой автоматизации."
                : "Автоматизация не настроена. Основные напоминания и оповещения в Телеграм остаются на стороне Supabase."}
            </p>
            <small>Сейчас рабочий набор интеграций: Telegram менеджера, клиентская status-page и webhook-слой автоматизации.</small>
          </article>
          <article className="settings-form-card">
            <strong>Телеграм</strong>
            <p>{"Номера чатов менеджеров:"} {managerProfiles.length ? managerProfiles.map((member) => member.telegram_chat_id || "не указан").join(", ") : "пока нет"}.</p>
          </article>
          <article className="settings-form-card">
            <strong>Что реально подключается сейчас</strong>
            <p>Онлайн-эквайринг, отдельные WhatsApp/API-коннекторы и внешние CRM пока не подключены в этом блоке. Сейчас здесь только живые интеграции, которые уже работают в продукте.</p>
          </article>
        </div>
      );
    }

    return (
      <div className="settings-panel-stack">
        <article className="settings-form-card">
          <strong>{"Смена пароля"}</strong>
          <form className="settings-edit-form" onSubmit={handlePasswordSubmit}>
            <label>
              {"Новый пароль"}
              <input type="password" value={passwordForm.next} onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))} />
            </label>
            <label>
              {"Повторите пароль"}
              <input type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} />
            </label>
            <button type="submit" className="button button-primary" disabled={passwordSaving || !passwordForm.next || passwordForm.next !== passwordForm.confirm}>
              {passwordSaving ? "Обновляем..." : "Сменить пароль"}
            </button>
          </form>
        </article>
      </div>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>{"Настройки"}</h1>
          <p>{"Блок настроек системы, команды, интеграций и операционной безопасности."}</p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="surface-card settings-nav-card">
          {settingsSections.map((section) => (
            <button key={section} type="button" className={activeSection === section ? "settings-nav-item active" : "settings-nav-item"} onClick={() => setActiveSection(section)}>
              {settingsSectionLabels[section]}
            </button>
          ))}
        </aside>

        <section className="surface-card settings-content-card">{renderSection()}</section>
      </div>
    </section>
  );
}

function ProtectedApp({ session, onSignOut }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [leadEvents, setLeadEvents] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [teamProfiles, setTeamProfiles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companySubscriptions, setCompanySubscriptions] = useState([]);
  const [companySubscriptionEvents, setCompanySubscriptionEvents] = useState([]);
  const [platformDemoRequests, setPlatformDemoRequests] = useState([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [companyMemberships, setCompanyMemberships] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [companyCreating, setCompanyCreating] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [subscriptionSavingId, setSubscriptionSavingId] = useState(null);
  const [demoRequestSavingId, setDemoRequestSavingId] = useState(null);
  const [companyPackApplyingId, setCompanyPackApplyingId] = useState(null);
  const [launchBundleSavingId, setLaunchBundleSavingId] = useState(null);
  const [starterAccessCreatingId, setStarterAccessCreatingId] = useState(null);
  const [starterAccessByCompany, setStarterAccessByCompany] = useState({});
  const [creatingLead, setCreatingLead] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [serviceSavingId, setServiceSavingId] = useState(null);
  const [creatingTeamMember, setCreatingTeamMember] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [applyingDemoPricing, setApplyingDemoPricing] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const automationWebhookUrl = import.meta.env.VITE_AUTOMATION_WEBHOOK_URL;
  const activeCompanyStorageKey = `detail-crm-active-company:${session.user.id}`;
  const getSelectedLeadStorageKey = (companyId) =>
    `detail-crm-selected-lead:${session.user.id}:${companyId || "no-company"}`;
  const currentMembership = useMemo(() => {
    if (!companyMemberships.length) {
      return null;
    }

    return companyMemberships.find((membership) => membership.company_id === activeCompanyId) || companyMemberships[0] || null;
  }, [companyMemberships, activeCompanyId]);
  const role = currentMembership?.role || "manager";
  const basePermissions = isPlatformAdmin
    ? { nav: [], canCreateLead: false, canEditLead: false }
    : getRolePermissions(role);

  function withCompanyScope(query, companyId) {
    if (!companyId) {
      return query;
    }

    return query.eq("company_id", companyId);
  }

  async function loadData(preferredLeadId = null, requestedCompanyId = null) {
    setLoading(true);
    setError("");

    try {
      const [
        { data: profileData, error: profileError },
        { data: membershipData, error: membershipError },
        { data: platformAdminData, error: platformAdminError }
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase
          .from("company_members")
          .select("company_id, role, is_active")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("platform_admins")
          .select("id, is_active")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .maybeSingle()
      ]);

      if (profileError) {
        throw profileError;
      }

      if (membershipError) {
        const message = membershipError.message || "";
        const relationMissing =
          membershipError.code === "42P01" ||
          message.includes("company_members") ||
          message.includes("relation") ||
          message.includes("does not exist");

        if (!relationMissing) {
          throw membershipError;
        }
      }

      if (platformAdminError) {
        const message = platformAdminError.message || "";
        const relationMissing =
          platformAdminError.code === "42P01" ||
          message.includes("platform_admins") ||
          message.includes("relation") ||
          message.includes("does not exist");

        if (!relationMissing) {
          throw platformAdminError;
        }
      }

      const nextMemberships = membershipData || [];
      const nextIsPlatformAdmin = Boolean(platformAdminData?.id);
      const storedCompanyId =
        typeof window !== "undefined" ? window.localStorage.getItem(activeCompanyStorageKey) : null;
      const requestedOrStoredCompanyId = requestedCompanyId || activeCompanyId || storedCompanyId || null;
      const resolvedCompanyId = nextMemberships.some((membership) => membership.company_id === requestedOrStoredCompanyId)
        ? requestedOrStoredCompanyId
        : nextMemberships[0]?.company_id || null;
      const membershipCompanyIds = nextMemberships.map((membership) => membership.company_id).filter(Boolean);

      const [
        { data: leadsData, error: leadsError },
        { data: clientsData, error: clientsError },
        { data: servicesData, error: servicesError },
        { data: leadEventsData, error: leadEventsError },
        { data: attachmentsData, error: attachmentsError },
        { data: companiesData, error: companiesError },
        { data: subscriptionsData, error: subscriptionsError },
        { data: subscriptionEventsData, error: subscriptionEventsError },
        { data: demoRequestsData, error: demoRequestsError },
        { data: activeCompanyMembersData, error: activeCompanyMembersError }
      ] = await Promise.all([
        withCompanyScope(
          supabase
            .from("leads")
            .select("*, clients(*), services(*)"),
          resolvedCompanyId
        ).order("created_at", { ascending: false }),
        withCompanyScope(
          supabase
            .from("clients")
            .select("*"),
          resolvedCompanyId
        ).order("created_at", { ascending: false }),
        withCompanyScope(
          supabase
            .from("services")
            .select("*"),
          resolvedCompanyId
        ).order("name", { ascending: true }),
        withCompanyScope(
          supabase
            .from("lead_events")
            .select("*"),
          resolvedCompanyId
        ).order("created_at", { ascending: false }),
        withCompanyScope(
          supabase
            .from("attachments")
            .select("*"),
          resolvedCompanyId
        ).order("created_at", { ascending: false }),
        nextIsPlatformAdmin
          ? supabase
              .from("companies")
              .select("id, name, slug, is_demo, business_type, status, contact_phone, contact_email, plan_code, created_at")
              .order("created_at", { ascending: true })
          : membershipCompanyIds.length
          ? supabase
              .from("companies")
              .select("id, name, slug, is_demo, business_type, status, contact_phone, contact_email, plan_code, created_at")
              .in("id", membershipCompanyIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        nextIsPlatformAdmin
          ? supabase
              .from("company_subscriptions")
              .select("*")
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        nextIsPlatformAdmin
          ? supabase
              .from("company_subscription_events")
              .select("*")
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        nextIsPlatformAdmin
          ? supabase
              .from("platform_demo_requests")
              .select("*")
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        resolvedCompanyId
          ? supabase
              .from("company_members")
              .select("id, company_id, user_id, role, is_active, created_at")
              .eq("company_id", resolvedCompanyId)
              .eq("is_active", true)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null })
      ]);

      if (leadsError) {
        throw leadsError;
      }

      if (clientsError) {
        throw clientsError;
      }

      if (servicesError) {
        throw servicesError;
      }

      if (leadEventsError) {
        throw leadEventsError;
      }

      if (attachmentsError) {
        throw attachmentsError;
      }

      if (companiesError) {
        throw companiesError;
      }

      if (subscriptionsError) {
        throw subscriptionsError;
      }

      if (subscriptionEventsError) {
        throw subscriptionEventsError;
      }

      if (demoRequestsError) {
        throw demoRequestsError;
      }

      if (activeCompanyMembersError) {
        throw activeCompanyMembersError;
      }

      const activeCompanyUserIds = (activeCompanyMembersData || []).map((member) => member.user_id).filter(Boolean);
      const { data: activeCompanyProfilesData, error: activeCompanyProfilesError } = activeCompanyUserIds.length
        ? await supabase.from("profiles").select("*").in("id", activeCompanyUserIds).order("created_at", { ascending: true })
        : { data: [], error: null };

      if (activeCompanyProfilesError) {
        throw activeCompanyProfilesError;
      }

      const nextTeamProfiles = mergeTeamProfiles(activeCompanyMembersData || [], activeCompanyProfilesData || []);
      let nextCompanies = companiesData || [];

      if (nextIsPlatformAdmin && nextCompanies.length) {
        const companyIds = nextCompanies.map((company) => company.id).filter(Boolean);
        const { data: ownerMembershipsData, error: ownerMembershipsError } = await supabase
          .from("company_members")
          .select("company_id, user_id, role, created_at")
          .in("company_id", companyIds)
          .eq("role", "owner")
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (ownerMembershipsError) {
          throw ownerMembershipsError;
        }

        const ownerUserIds = [...new Set((ownerMembershipsData || []).map((member) => member.user_id).filter(Boolean))];
        const { data: ownerProfilesData, error: ownerProfilesError } = ownerUserIds.length
          ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerUserIds)
          : { data: [], error: null };

        if (ownerProfilesError) {
          throw ownerProfilesError;
        }

        const [
          { data: platformMembersData, error: platformMembersError },
          { data: platformClientsData, error: platformClientsError },
          { data: platformLeadsData, error: platformLeadsError },
          { data: platformServicesData, error: platformServicesError }
        ] = await Promise.all([
          supabase.from("company_members").select("company_id, role, is_active").in("company_id", companyIds),
          supabase.from("clients").select("company_id").in("company_id", companyIds),
          supabase.from("leads").select("company_id, status").in("company_id", companyIds),
          supabase.from("services").select("company_id, is_active").in("company_id", companyIds)
        ]);

        if (platformMembersError) {
          throw platformMembersError;
        }

        if (platformClientsError) {
          throw platformClientsError;
        }

        if (platformLeadsError) {
          throw platformLeadsError;
        }

        if (platformServicesError) {
          throw platformServicesError;
        }

        const ownerProfilesById = new Map((ownerProfilesData || []).map((profile) => [profile.id, profile]));
        const firstOwnerByCompanyId = new Map();
        const countsByCompanyId = new Map();

        function ensureCompanyCounts(companyId) {
          if (!countsByCompanyId.has(companyId)) {
            countsByCompanyId.set(companyId, {
              active_members_count: 0,
              active_staff_members_count: 0,
              manager_members_count: 0,
              detailer_members_count: 0,
              clients_count: 0,
              leads_count: 0,
              open_leads_count: 0,
              services_count: 0
            });
          }

          return countsByCompanyId.get(companyId);
        }

        for (const membership of ownerMembershipsData || []) {
          if (!firstOwnerByCompanyId.has(membership.company_id)) {
            firstOwnerByCompanyId.set(membership.company_id, membership);
          }
        }

        for (const membership of platformMembersData || []) {
          const bucket = ensureCompanyCounts(membership.company_id);
          if (membership.is_active) {
            bucket.active_members_count += 1;
            if (membership.role === "manager") {
              bucket.active_staff_members_count += 1;
              bucket.manager_members_count += 1;
            }
            if (membership.role === "detailer") {
              bucket.active_staff_members_count += 1;
              bucket.detailer_members_count += 1;
            }
          }
        }

        for (const client of platformClientsData || []) {
          const bucket = ensureCompanyCounts(client.company_id);
          bucket.clients_count += 1;
        }

        for (const lead of platformLeadsData || []) {
          const bucket = ensureCompanyCounts(lead.company_id);
          bucket.leads_count += 1;
          if (!["done", "delivered", "lost"].includes(getLeadStageKey(lead.status))) {
            bucket.open_leads_count += 1;
          }
        }

        for (const service of platformServicesData || []) {
          const bucket = ensureCompanyCounts(service.company_id);
          if (service.is_active !== false) {
            bucket.services_count += 1;
          }
        }

        nextCompanies = nextCompanies.map((company) => {
          const ownerMembership = firstOwnerByCompanyId.get(company.id) || null;
          const ownerProfile = ownerMembership ? ownerProfilesById.get(ownerMembership.user_id) : null;
          const usage = countsByCompanyId.get(company.id) || {};

          return {
            ...company,
            owner_name: ownerProfile?.full_name || null,
            owner_email: ownerProfile?.email || null,
            owner_connected_at: ownerMembership?.created_at || null,
            active_members_count: usage.active_members_count || 0,
            active_staff_members_count: usage.active_staff_members_count || 0,
            manager_members_count: usage.manager_members_count || 0,
            detailer_members_count: usage.detailer_members_count || 0,
            clients_count: usage.clients_count || 0,
            leads_count: usage.leads_count || 0,
            open_leads_count: usage.open_leads_count || 0,
            services_count: usage.services_count || 0
          };
        });
      }

      const nextLeads = leadsData || [];
      const nextClients = clientsData || [];
      const nextServices = servicesData || [];
      const nextLeadEvents = leadEventsData || [];
      const nextAttachments = attachmentsData || [];
      const storedLeadId =
        typeof window !== "undefined" && resolvedCompanyId
          ? window.localStorage.getItem(getSelectedLeadStorageKey(resolvedCompanyId))
          : null;
      const leadExists = (leadId) => (leadId ? nextLeads.some((lead) => lead.id === leadId) : false);
      const nextSelectedLeadId =
        [preferredLeadId, storedLeadId, selectedLeadId].find((leadId) => leadExists(leadId)) ||
        nextLeads[0]?.id ||
        null;

      setCompanyMemberships(nextMemberships);
      setIsPlatformAdmin(nextIsPlatformAdmin);
      setCompanies(nextCompanies);
      setCompanySubscriptions(subscriptionsData || []);
      setCompanySubscriptionEvents(subscriptionEventsData || []);
      setPlatformDemoRequests(demoRequestsData || []);
      setActiveCompanyId(resolvedCompanyId || null);
      setLeads(nextLeads);
      setClients(nextClients);
      setServices(nextServices);
      setLeadEvents(nextLeadEvents);
      setAttachments(nextAttachments);
      setProfile(profileData || null);
      setTeamProfiles(nextTeamProfiles);
      setSelectedLeadId(nextSelectedLeadId);
      if (typeof window !== "undefined" && resolvedCompanyId && nextSelectedLeadId) {
        window.localStorage.setItem(getSelectedLeadStorageKey(resolvedCompanyId), nextSelectedLeadId);
      }
    } catch (loadError) {
      setError(loadError.message || "Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }

  async function createTimelineEvent(eventInput) {
    const scopedCompanyId = resolveScopedCompanyId(
      eventInput.company_id || leads.find((lead) => lead.id === eventInput.lead_id)?.company_id || null,
      "Создание события"
    );
    const { data, error: eventError } = await createLeadEvent(supabase, {
      ...eventInput,
      company_id: scopedCompanyId
    });

    if (!eventError && data) {
      setLeadEvents((current) => [data, ...current]);
    }

    return { data, error: eventError };
  }

  async function createLead(form) {
    const scopedCompanyId = resolveScopedCompanyId(null, "Создание заявки");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    setCreatingLead(true);
    setError("");
    setSaveMessage("");

    try {
      const { client: clientRecord, reused } = await createOrReuseClient(supabase, form, scopedCompanyId);
      setClients((current) => {
        const exists = current.some((client) => client.id === clientRecord.id);
        if (exists) {
          return current.map((client) => (client.id === clientRecord.id ? clientRecord : client));
        }

        return [clientRecord, ...current];
      });

      const createdLead = await createLeadRecord(supabase, clientRecord.id, form, scopedCompanyId);

      setLeads((current) => [createdLead, ...current]);
      setSelectedLeadId(createdLead.id);

      await createTimelineEvent({
        lead_id: createdLead.id,
        company_id: createdLead.company_id || scopedCompanyId,
        type: "created",
        note: `Заявка создана из канала ${formatLabel(form.source)}`,
        payload: {
          source: form.source,
          service_id: createdLead.service_id,
          follow_up_at: createdLead.follow_up_at
        },
        created_by: session.user.id
      });

      if (form.comment.trim()) {
        await createTimelineEvent({
          lead_id: createdLead.id,
          company_id: createdLead.company_id || scopedCompanyId,
          type: "note_added",
          note: form.comment.trim(),
          payload: {
            origin: "lead_create"
          },
          created_by: session.user.id
        });
      }

      try {
        await sendAutomationWebhook(automationWebhookUrl, {
          event: "lead_created",
          lead: createdLead,
          client: clientRecord
        });
      } catch (webhookError) {
        setError(webhookError.message || "Заявка создана, но внешний webhook автоматизации не отработал.");
      }

      setSaveMessage(reused ? "Заявка создана, существующий клиент обновлён." : "Заявка успешно создана.");
      return true;
    } catch (createError) {
      setError(createError.message || "Не удалось создать заявку.");
      return false;
    } finally {
      setCreatingLead(false);
    }
  }

  async function updateLeadStatus(leadId, nextStatus) {
    const previousLeads = leads;
    const previousLead = previousLeads.find((lead) => lead.id === leadId);
    if (!previousLead || previousLead.status === nextStatus) {
      return;
    }

    const scopedCompanyId = resolveScopedCompanyId(previousLead.company_id || null, "Обновление статуса");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return;
    }

    const optimistic = previousLeads.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead));
    setLeads(optimistic);
    setError("");
    setSaveMessage("");
    setStatusSavingId(leadId);

    try {
      const { error: updateError } = await updateLeadStatusRecord(supabase, leadId, nextStatus, scopedCompanyId);

      if (updateError) {
        setLeads(previousLeads);
        setError(updateError.message || "Не удалось обновить заявку.");
        return;
      }

      await createTimelineEvent({
        lead_id: leadId,
        company_id: scopedCompanyId,
        type: "status_changed",
        note: `Статус изменён с "${statusLabels[previousLead.status] || previousLead.status}" на "${statusLabels[nextStatus] || nextStatus}"`,
        payload: {
          from: previousLead.status,
          to: nextStatus
        },
        created_by: session.user.id
      });

      let notificationSuffix = "";
      if (nextStatus === "done") {
        const { data: notificationData, error: notificationError } = await supabase.functions.invoke("client-ready-telegram", {
          body: {
            lead_id: leadId
          }
        });

        if (notificationError) {
          notificationSuffix = " Статус сохранён, но уведомление клиенту не отправилось.";
        } else if (notificationData?.status === "sent") {
          notificationSuffix = " Клиенту отправлено сообщение в Telegram.";
        } else if (notificationData?.reason === "already_sent") {
          notificationSuffix = " Сообщение клиенту уже отправлялось раньше.";
        } else if (notificationData?.reason === "telegram_not_connected") {
          notificationSuffix = " Telegram клиента ещё не подключён.";
        }
      }

      setSaveMessage(`Статус обновлён: ${statusLabels[nextStatus] || nextStatus}.${notificationSuffix}`);
    } finally {
      setStatusSavingId(null);
    }
  }

  async function updateLeadAssignee(lead, assignedTo) {
    const scopedCompanyId = resolveScopedCompanyId(lead.company_id || null, "Назначение мастера");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    const previousLeads = leads;
    const previousAssignedTo = lead.assigned_to || null;
    const normalizedAssignedTo = assignedTo || null;

    if (previousAssignedTo === normalizedAssignedTo) {
      return true;
    }

    setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, assigned_to: normalizedAssignedTo } : item)));
    setError("");
    setSaveMessage("");

    try {
      const { data, error: updateError } = await supabase
        .from("leads")
        .update({ assigned_to: normalizedAssignedTo })
        .eq("id", lead.id)
        .eq("company_id", scopedCompanyId)
        .select("*, clients(*), services(*)")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (data) {
        setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, ...data } : item)));
      }

      const assignedProfile = teamProfiles.find((member) => member.id === normalizedAssignedTo);
      await createTimelineEvent({
        lead_id: lead.id,
        company_id: scopedCompanyId,
        type: "assigned",
        note: normalizedAssignedTo
          ? `Назначен мастер: ${formatTeamMemberLabel(assignedProfile, "сотрудник")}`
          : "Назначение мастера снято.",
        payload: {
          previous_assigned_to: previousAssignedTo,
          assigned_to: normalizedAssignedTo
        },
        created_by: session.user.id
      });

      setSaveMessage(normalizedAssignedTo ? "Мастер назначен." : "Назначение мастера снято.");
      return true;
    } catch (assignError) {
      setLeads(previousLeads);
      setError(assignError.message || "Не удалось назначить мастера.");
      return false;
    }
  }

  async function updateLeadPayment(lead, paymentInput) {
    const scopedCompanyId = resolveScopedCompanyId(lead.company_id || null, "Обновление оплаты");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    const previousLeads = leads;
    const normalizedMethod = paymentInput.payment_method || null;
    const requestedStatus = paymentStatusOptions.includes(paymentInput.payment_status)
      ? paymentInput.payment_status
      : "unpaid";
    const totalAmount = getLeadAmount(lead);
    const parsedPaidAmount = parsePaymentAmountInput(paymentInput.paid_amount);

    if (Number.isNaN(parsedPaidAmount)) {
      setError("Оплата не сохранена: сумма должна быть числом.");
      return false;
    }

    let normalizedPaidAmount =
      parsedPaidAmount == null || parsedPaidAmount <= 0 ? null : parsedPaidAmount;

    if (requestedStatus === "unpaid") {
      normalizedPaidAmount = null;
    } else if (requestedStatus === "paid" && normalizedPaidAmount == null && totalAmount > 0) {
      normalizedPaidAmount = Number(totalAmount);
    }

    const normalizedStatus = requestedStatus;
    const paidAt = normalizedStatus === "unpaid" ? null : new Date().toISOString();
    const paymentUpdatePayload = {
      payment_status: normalizedStatus,
      payment_method: normalizedMethod,
      paid_amount: normalizedPaidAmount,
      paid_at: paidAt,
      updated_at: new Date().toISOString()
    };

    setError("");
    setSaveMessage("");

    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              ...paymentUpdatePayload
            }
          : item
      )
    );

    try {
      const { data, error: updateError } = await supabase
        .from("leads")
        .update(paymentUpdatePayload)
        .eq("id", lead.id)
        .eq("company_id", scopedCompanyId)
        .select("*, clients(*), services(*)")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error("Оплата не сохранилась: заявка не обновилась в базе.");
      }

      const returnedPaidAmount = data.paid_amount == null ? null : Number(data.paid_amount);
      const paymentMatches =
        data.payment_status === normalizedStatus &&
        (data.payment_method || null) === normalizedMethod &&
        Number(returnedPaidAmount || 0) === Number(normalizedPaidAmount || 0);

      if (!paymentMatches) {
        throw new Error("Оплата не сохранилась: база вернула старые значения.");
      }

      setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, ...data } : item)));

      let timelineWarning = "";
      const { error: paymentEventError } = await createTimelineEvent({
        lead_id: lead.id,
        company_id: scopedCompanyId,
        type: "payment_updated",
        note:
          normalizedStatus === "unpaid"
            ? "Оплата очищена."
            : normalizedStatus === "paid"
              ? `Заявка оплачена полностью${normalizedPaidAmount ? `: ${formatCurrency(normalizedPaidAmount)}` : ""}.`
              : `Оплата обновлена: внесено ${formatCurrency(normalizedPaidAmount || 0)}.`,
        payload: {
          payment_status: normalizedStatus,
          payment_method: normalizedMethod,
          paid_amount: normalizedPaidAmount
        },
        created_by: session.user.id
      });

      if (paymentEventError) {
        timelineWarning = " Оплата сохранена, но событие в истории не записалось.";
      }

      await loadData(lead.id, scopedCompanyId);
      setSaveMessage(`Оплата по заявке сохранена.${timelineWarning}`);
      return data;
    } catch (paymentError) {
      setLeads(previousLeads);
      setError(paymentError.message || "Не удалось сохранить оплату.");
      return false;
    }
  }

  async function updateLeadFollowUp(lead, followUpInput) {
    const scopedCompanyId = resolveScopedCompanyId(lead.company_id || null, "Обновление следующего контакта");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    const previousLeads = leads;
    const nextFollowUpAt = followUpInput ? new Date(followUpInput).toISOString() : null;

    if ((lead.follow_up_at || null) === nextFollowUpAt) {
      return true;
    }

    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              follow_up_at: nextFollowUpAt
            }
          : item
      )
    );
    setError("");
    setSaveMessage("");

    const { error: updateError } = await updateLeadFollowUpRecord(supabase, lead.id, followUpInput, scopedCompanyId);

    if (updateError) {
      setLeads(previousLeads);
      setError(updateError.message || "Не удалось обновить следующий контакт.");
      return false;
    }

    await createTimelineEvent({
      lead_id: lead.id,
      company_id: scopedCompanyId,
      type: "follow_up_set",
      note: nextFollowUpAt ? `Следующий контакт назначен на ${formatDate(nextFollowUpAt)}` : "Следующий контакт очищен",
      payload: {
        follow_up_at: nextFollowUpAt
      },
      created_by: session.user.id
    });

    try {
      await sendAutomationWebhook(automationWebhookUrl, {
        event: "follow_up_updated",
        lead: {
          ...lead,
          follow_up_at: nextFollowUpAt
        }
      });
    } catch (webhookError) {
      setError(webhookError.message || "Следующий контакт обновлён, но внешний webhook автоматизации не отработал.");
    }

    setSaveMessage(nextFollowUpAt ? "Следующий контакт сохранён." : "Следующий контакт очищен.");
    return true;
  }

  async function addLeadNote(leadId, note) {
    setError("");
    setSaveMessage("");

    const lead = leads.find((item) => item.id === leadId);
    const scopedCompanyId = resolveScopedCompanyId(lead?.company_id || null, "Добавление заметки");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    const { data, error: noteError } = await addLeadNoteRecord(
      supabase,
      leadId,
      note,
      session.user.id,
      scopedCompanyId
    );

    if (noteError) {
      setError(noteError.message || "Не удалось добавить заметку.");
      return false;
    }

    if (data) {
      setLeadEvents((current) => [data, ...current]);
    }

    setSaveMessage("Заметка добавлена.");
    return true;
  }

  async function createLeadAttachment(leadId, file, isCustomerVisible, photoStage) {
    setError("");
    setSaveMessage("");

    try {
      const lead = leads.find((item) => item.id === leadId);
      const scopedCompanyId = resolveScopedCompanyId(lead?.company_id || null, "Загрузка фото");

      if (!ensureCompanyWritable(scopedCompanyId)) {
        return false;
      }

      const data = await uploadLeadAttachmentFile(
        supabase,
        leadId,
        file,
        isCustomerVisible,
        photoStage,
        scopedCompanyId
      );
      if (data) {
        setAttachments((current) => [data, ...current]);
      }

      await loadData(leadId, scopedCompanyId);
      setSaveMessage(isCustomerVisible ? "Фото загружено и видно клиенту." : "Фото загружено во внутреннюю карточку.");
      return true;
    } catch (uploadError) {
      setError(uploadError.message || "Не удалось загрузить фото.");
      return false;
    }
  }

  async function deleteAttachment(attachmentId) {
    setError("");
    setSaveMessage("");

    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      return false;
    }

    const scopedCompanyId = resolveScopedCompanyId(attachment.company_id || null, "Удаление фото");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    if (attachment.storage_bucket && attachment.storage_object_path) {
      const { error: storageError } = await supabase.storage.from(attachment.storage_bucket).remove([attachment.storage_object_path]);
      if (storageError) {
        setError(storageError.message || "Не удалось удалить файл из хранилища.");
        return false;
      }
    }

    const { error: deleteError } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("company_id", scopedCompanyId);

    if (deleteError) {
      setError(deleteError.message || "Не удалось удалить фото.");
      return false;
    }

    setAttachments((current) => current.filter((item) => item.id !== attachmentId));
    setSaveMessage("Фото удалено.");
    return true;
  }

  async function updateAttachmentVisibility(attachmentId, isCustomerVisible) {
    setError("");
    setSaveMessage("");

    const attachmentCompanyId = attachments.find((item) => item.id === attachmentId)?.company_id || null;
    const scopedCompanyId = resolveScopedCompanyId(attachmentCompanyId, "Обновление видимости фото");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    const { data, error: updateError } = await supabase
      .from("attachments")
      .update({ is_customer_visible: isCustomerVisible })
      .eq("id", attachmentId)
      .eq("company_id", scopedCompanyId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      setError(updateError.message || "Не удалось обновить видимость фото.");
      return false;
    }

    if (data) {
      setAttachments((current) => current.map((attachment) => (attachment.id === attachmentId ? { ...attachment, ...data } : attachment)));
    }

    setSaveMessage(isCustomerVisible ? "Фото теперь видно клиенту." : "Фото скрыто с клиентской страницы.");
    return true;
  }

  async function saveProfileSettings(input) {
    setProfileSaving(true);
    setError("");
    setSaveMessage("");

    const payload = {
      full_name: input.full_name.trim(),
      telegram_chat_id: input.telegram_chat_id.trim() || null
    };

    const { data, error: updateError } = await supabase.from("profiles").update(payload).eq("id", session.user.id).select("*").maybeSingle();

    if (updateError) {
      setError(updateError.message || "Не удалось сохранить профиль.");
      setProfileSaving(false);
      return false;
    }

    setProfile(data || null);
    setTeamProfiles((current) => current.map((member) => (member.id === session.user.id ? { ...member, ...payload } : member)));
    setSaveMessage("Профиль обновлён.");
    setProfileSaving(false);
    return true;
  }
  async function updateTeamMember(memberId, input) {
    const profilePayload = {
      full_name: input.full_name.trim(),
      telegram_chat_id: input.telegram_chat_id.trim() || null
    };

    const memberToUpdate = teamProfiles.find((member) => member.id === memberId);
    if (!memberToUpdate) {
      setError("Участник не найден.");
      return false;
    }

    const scopedCompanyId = resolveScopedCompanyId(memberToUpdate.company_id || null, "Обновление участника");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    setTeamSaving(true);
    setError("");
    setSaveMessage("");

    const [
      { data: profileData, error: profileError },
      { data: membershipData, error: membershipError }
    ] = await Promise.all([
      supabase.from("profiles").update(profilePayload).eq("id", memberId).select("*").maybeSingle(),
      supabase
        .from("company_members")
        .update({ role: input.role })
        .eq("id", memberToUpdate.membership_id)
        .eq("company_id", scopedCompanyId)
        .select("id, company_id, user_id, role, is_active, created_at")
        .maybeSingle()
    ]);

    if (profileError || membershipError) {
      setError(profileError?.message || membershipError?.message || "Не удалось обновить участника.");
      setTeamSaving(false);
      return false;
    }

    const mergedMember = mergeTeamProfiles([membershipData || memberToUpdate], [profileData || memberToUpdate])[0];

    setTeamProfiles((current) => current.map((member) => (member.id === memberId ? { ...member, ...mergedMember } : member)));
    if (memberId === session.user.id) {
      setProfile((current) => (current ? { ...current, ...profileData } : current));
    }
    setSaveMessage("Участник обновлён.");
    setTeamSaving(false);
    return true;
  }
  async function deleteTeamMember(memberId) {
    const memberToDelete = teamProfiles.find((member) => member.id === memberId);
    if (!memberToDelete) {
      setError("Участник не найден.");
      return false;
    }

    const scopedCompanyId = resolveScopedCompanyId(memberToDelete.company_id || null, "Удаление участника");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    setTeamSaving(true);
    setError("");
    setSaveMessage("");

    const { error: deleteError } = await supabase
      .from("company_members")
      .update({ is_active: false })
      .eq("id", memberToDelete.membership_id)
      .eq("company_id", scopedCompanyId);

    if (deleteError) {
      setError(deleteError.message || "Не удалось удалить участника.");
      setTeamSaving(false);
      return false;
    }

    setTeamProfiles((current) => current.filter((member) => member.id !== memberId));
    setSaveMessage("Участник удалён.");
    setTeamSaving(false);
    return true;
  }
  async function createCompanyMemberAccount(companyId, input, options = {}) {
    const {
      syncToCurrentTeam = false,
      successMessage = "Новый участник создан.",
      companyNameForError = ""
    } = options;

    if (!companyId) {
      throw new Error("Компания не выбрана.");
    }

    const inviteClient = createInviteSupabaseClient();
    const { data: signUpData, error: signUpError } = await inviteClient.auth.signUp({
      email: input.email.trim(),
      password: input.password.trim(),
      options: {
        data: {
          full_name: input.full_name.trim()
        }
      }
    });

    if (signUpError) {
      throw signUpError;
    }

    const nextUserId = signUpData.user?.id;
    if (!nextUserId) {
      throw new Error("Не удалось получить id нового аккаунта.");
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from("company_members")
      .upsert(
        {
          company_id: companyId,
          user_id: nextUserId,
          role: input.role,
          is_active: true
        },
        { onConflict: "company_id,user_id" }
      )
      .select("id, company_id, user_id, role, is_active, created_at")
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    const profilePayload = {
      id: nextUserId,
      email: input.email.trim(),
      full_name: input.full_name.trim(),
      telegram_chat_id: input.telegram_chat_id?.trim() || null
    };

    const { data: profileData, error: upsertError } = await supabase.from("profiles").upsert(profilePayload).select("*").maybeSingle();

    if (upsertError) {
      throw upsertError;
    }

    const mergedMember = mergeTeamProfiles([membershipData], [profileData || profilePayload])[0];

    if (syncToCurrentTeam && activeCompanyId === companyId) {
      setTeamProfiles((current) => {
        const exists = current.some((member) => member.id === nextUserId);
        if (exists) {
          return current.map((member) => (member.id === nextUserId ? { ...member, ...mergedMember } : member));
        }
        return [...current, mergedMember];
      });
    }

    setSaveMessage(companyNameForError ? `${successMessage} ${companyNameForError}` : successMessage);
    return {
      userId: nextUserId,
      profile: profileData || profilePayload,
      membership: membershipData,
      mergedMember
    };
  }
  async function ensureOwnerAccessForCompany(company, request) {
    const ownerEmail = String(getDemoRequestCommerceSnapshot(request).ownerEmail || "").trim().toLowerCase();
    const ownerName = String(request?.name || "").trim() || `${company?.name || "Company"} ${roleLabels.owner}`;

    if (!company?.id || !ownerEmail) {
      return { skipped: true };
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", ownerEmail)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile?.id) {
      const { error: membershipError } = await supabase.from("company_members").upsert(
        {
          company_id: company.id,
          user_id: existingProfile.id,
          role: "owner",
          is_active: true
        },
        { onConflict: "company_id,user_id" }
      );

      if (membershipError) {
        throw membershipError;
      }

      if (!existingProfile.full_name && ownerName) {
        const { error: profileUpdateError } = await supabase.from("profiles").upsert({
          id: existingProfile.id,
          email: ownerEmail,
          full_name: ownerName
        });

        if (profileUpdateError) {
          throw profileUpdateError;
        }
      }

      return {
        reused: true,
        item: {
          role: "owner",
          email: ownerEmail,
          password: "",
          full_name: existingProfile.full_name || ownerName,
          created_at: new Date().toISOString(),
          note: "Аккаунт уже существовал, owner привязан к компании"
        }
      };
    }

    const credentials = buildPlatformStarterCredentials(company, "owner");
    credentials.email = ownerEmail;
    credentials.full_name = ownerName;

    await createCompanyMemberAccount(company.id, credentials, {
      syncToCurrentTeam: false,
      successMessage: "Owner доступ создан."
    });

    return {
      reused: false,
      item: {
        role: "owner",
        email: credentials.email,
        password: credentials.password,
        full_name: credentials.full_name,
        created_at: new Date().toISOString(),
        note: "Owner login создан автоматически из onboarding lead"
      }
    };
  }
  async function createTeamMember(input) {
    const scopedCompanyId = resolveScopedCompanyId(null, "Создание участника");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    setCreatingTeamMember(true);
    setError("");
    setSaveMessage("");

    try {
      await createCompanyMemberAccount(scopedCompanyId, input, {
        syncToCurrentTeam: true,
        successMessage: "Новый участник создан."
      });
      return true;
    } catch (createError) {
      setError(createError.message || "Не удалось создать участника.");
      return false;
    } finally {
      setCreatingTeamMember(false);
    }
  }
  async function updateServiceSettings(serviceId, input) {
    const scopedCompanyId = resolveScopedCompanyId(null, "Обновление услуги");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    setServiceSavingId(serviceId);
    setError("");
    setSaveMessage("");

    const payload = {
      name: input.name.trim(),
      base_price: Number(input.base_price || 0),
      duration_minutes: Number(input.duration_minutes || 0),
      is_active: Boolean(input.is_active)
    };

    const updateQuery = supabase.from("services").update(payload).eq("id", serviceId).eq("company_id", scopedCompanyId);

    const { data, error: updateError } = await updateQuery.select("*").maybeSingle();

    if (updateError) {
      setError(updateError.message || "Не удалось обновить услугу.");
      setServiceSavingId(null);
      return false;
    }

    setServices((current) => current.map((service) => (service.id === serviceId ? { ...service, ...data } : service)));
    setSaveMessage("Услуга обновлена.");
    setServiceSavingId(null);
    return true;
  }
  async function createServiceSettings(input) {
    const scopedCompanyId = resolveScopedCompanyId(null, "Создание услуги");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    setCreatingService(true);
    setError("");
    setSaveMessage("");

    const payload = {
      name: input.name.trim(),
      base_price: Number(input.base_price || 0),
      duration_minutes: Number(input.duration_minutes || 0),
      is_active: Boolean(input.is_active),
      company_id: scopedCompanyId
    };

    const { data, error: insertError } = await supabase.from("services").insert(payload).select("*").maybeSingle();

    if (insertError) {
      setError(insertError.message || "Не удалось добавить услугу.");
      setCreatingService(false);
      return false;
    }

    setServices((current) => [...current, data || payload].sort((a, b) => a.name.localeCompare(b.name)));
    setSaveMessage("Новая услуга добавлена.");
    setCreatingService(false);
    return true;
  }
  async function applyDemoPricing() {
    const scopedCompanyId = resolveScopedCompanyId(null, "Применение пакета услуг");

    if (!ensureCompanyWritable(scopedCompanyId)) {
      return false;
    }

    setApplyingDemoPricing(true);
    setError("");
    setSaveMessage("");

    try {
      const presets = getDemoServicePresets(currentCompany?.business_type || "detailing");

      for (const preset of presets) {
        const existing = services.find((service) => service.name.toLowerCase() === preset.name.toLowerCase());
        if (existing) {
          let updateQuery = supabase
            .from("services")
            .update({
              base_price: preset.base_price,
              duration_minutes: preset.duration_minutes,
              is_active: true
            })
            .eq("id", existing.id)
            .eq("company_id", scopedCompanyId);

          const { error: updateError } = await updateQuery;
          if (updateError) {
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase.from("services").insert({
            name: preset.name,
            base_price: preset.base_price,
            duration_minutes: preset.duration_minutes,
            is_active: true,
            company_id: scopedCompanyId
          });
          if (insertError) {
            throw insertError;
          }
        }
      }

      await loadData(selectedLeadId);
      setSaveMessage(`Услуги для ниши "${businessTypeLabels[currentCompany?.business_type] || "Детейлинг"}" обновлены.`);
      return true;
    } catch (applyError) {
      setError(applyError.message || "Не удалось применить демо-цены.");
      return false;
    } finally {
      setApplyingDemoPricing(false);
    }
  }
  async function changePassword(nextPassword) {
    setPasswordSaving(true);
    setError("");
    setSaveMessage("");

    const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });

    if (updateError) {
      setError(updateError.message || "Не удалось сменить пароль.");
      setPasswordSaving(false);
      return false;
    }

    setSaveMessage("Пароль обновлён.");
    setPasswordSaving(false);
    return true;
  }
  async function handlePhoneAction(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("У клиента нет номера телефона.");
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalized);
      }
    } catch {
      // ignore clipboard errors
    }

    window.location.href = `tel:${normalized}`;
      setSaveMessage(`Номер ${normalized} передан в системный набор.`);
  }

  async function handleCompanyChange(nextCompanyId) {
    if (!nextCompanyId || nextCompanyId === activeCompanyId) {
      return;
    }

    setSelectedLeadId(null);
    setLeads([]);
    setClients([]);
    setServices([]);
    setLeadEvents([]);
    setAttachments([]);
    setTeamProfiles([]);
    setActiveCompanyId(nextCompanyId);
    await loadData(null, nextCompanyId);
    const nextCompany = companies.find((company) => company.id === nextCompanyId);
    if (nextCompany?.name) {
      setSaveMessage(`Активная компания: ${nextCompany.name}`);
    }
  }

  async function createCompanyWorkspace(input) {
    setCompanyCreating(true);
    setError("");
    setSaveMessage("");

    try {
      const normalizedSlug = slugifyCompanyName(input.slug || input.name);
      if (!normalizedSlug) {
        throw new Error("Укажите корректный slug компании.");
      }

      const companyPayload = {
        name: input.name.trim(),
        slug: normalizedSlug,
        is_demo: false,
        business_type: input.business_type || "detailing",
        contact_phone: input.contact_phone.trim() || null,
        contact_email: input.contact_email.trim() || null,
        plan_code: "starter",
        status: "active"
      };

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert(companyPayload)
        .select("id, name, slug, is_demo, business_type, status, contact_phone, contact_email, plan_code, created_at")
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (!companyData?.id) {
        throw new Error("Не удалось создать компанию.");
      }

      const { error: memberError } = await supabase.from("company_members").insert({
        company_id: companyData.id,
        user_id: session.user.id,
        role: "owner",
        is_active: true
      });

      if (memberError) {
        throw memberError;
      }

      setSaveMessage("Компания создана. Пространство подключено.");
      setActiveCompanyId(companyData.id);
      await loadData(null, companyData.id);
      return true;
    } catch (createError) {
      setError(createError.message || "Не удалось создать компанию.");
      return false;
    } finally {
      setCompanyCreating(false);
    }
  }

  async function openCompanyWorkspace(companyId) {
    if (!companyId || isPlatformAdmin) {
      return;
    }

    await handleCompanyChange(companyId);
    navigate("/dashboard");
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!saveMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [saveMessage]);

  useEffect(() => {
    if (!activeCompanyId || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(activeCompanyStorageKey, activeCompanyId);
  }, [activeCompanyId, activeCompanyStorageKey]);

  useEffect(() => {
    if (!activeCompanyId || !selectedLeadId || typeof window === "undefined") {
      return;
    }

    const selectedLeadBelongsToCompany = leads.some(
      (lead) => lead.id === selectedLeadId && lead.company_id === activeCompanyId
    );

    if (selectedLeadBelongsToCompany) {
      window.localStorage.setItem(getSelectedLeadStorageKey(activeCompanyId), selectedLeadId);
    }
  }, [activeCompanyId, leads, selectedLeadId]);

  const visibleLeads = useMemo(() => {
    if (role === "detailer") {
      return leads.filter((lead) => lead.assigned_to === session.user.id);
    }

    return leads;
  }, [leads, role, session.user.id]);

  const visibleLeadIds = useMemo(() => new Set(visibleLeads.map((lead) => lead.id)), [visibleLeads]);
  const detailerProfiles = useMemo(() => teamProfiles.filter((member) => member.role === "detailer"), [teamProfiles]);
  const currentCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) || companies[0] || null,
    [companies, activeCompanyId]
  );
  const currentCompanyIsReadOnly = Boolean(!isPlatformAdmin && currentCompany && currentCompany.status !== "active");
  const permissions = currentCompanyIsReadOnly
    ? { ...basePermissions, canCreateLead: false, canEditLead: false }
    : basePermissions;
  const currentCompanyReadOnlyMessage = getCompanyReadOnlyMessage(currentCompany);
  const accessibleCompanyIds = useMemo(
    () => new Set(companyMemberships.map((membership) => membership.company_id).filter(Boolean)),
    [companyMemberships]
  );
  const visibleLeadEvents = useMemo(
    () => leadEvents.filter((event) => visibleLeadIds.has(event.lead_id)),
    [leadEvents, visibleLeadIds]
  );
  const visibleAttachments = useMemo(
    () => attachments.filter((attachment) => visibleLeadIds.has(attachment.lead_id)),
    [attachments, visibleLeadIds]
  );

  const metrics = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const clientsCount = clients.length;
    const todayLeads = visibleLeads.filter((lead) => new Date(lead.created_at).toDateString() === now.toDateString()).length;
    const newCount = visibleLeads.filter((lead) => lead.status === "new").length;
    const followUpCount = visibleLeads.filter((lead) => lead.follow_up_at && new Date(lead.follow_up_at) <= now).length;
    const openTasks = visibleLeads.filter((lead) => getLeadStageKey(lead.status) === "in_progress" || lead.follow_up_at).length;
    const monthDoneLeads = visibleLeads.filter(
      (lead) => ["done", "delivered"].includes(getLeadStageKey(lead.status)) && String(lead.updated_at || lead.created_at || "").slice(0, 7) === monthKey
    );
    const monthRevenue = monthDoneLeads.reduce((total, lead) => total + getLeadAmount(lead), 0);
    const monthClosedLeads = monthDoneLeads.length;
    const monthAverageTicket = monthClosedLeads ? monthRevenue / monthClosedLeads : 0;
    const monthPaidLeadsList = visibleLeads.filter(
      (lead) => lead.payment_status !== "unpaid" && String(lead.paid_at || "").slice(0, 7) === monthKey
    );
    const monthPaidRevenue = monthPaidLeadsList.reduce((total, lead) => total + getLeadPaidAmount(lead), 0);
    const activeMonthLeads = visibleLeads.filter(
      (lead) => getLeadStageKey(lead.status) !== "lost" && String(lead.created_at || "").slice(0, 7) === monthKey
    );
    const monthOutstandingRevenue = activeMonthLeads.reduce((total, lead) => total + getLeadOutstandingAmount(lead), 0);
    const monthPaidLeads = monthPaidLeadsList.length;
    const monthPartialLeads = activeMonthLeads.filter((lead) => lead.payment_status === "partial").length;
    const monthUnpaidLeads = activeMonthLeads.filter((lead) => lead.payment_status === "unpaid").length;
    const monthDebtLeadsRevenue = activeMonthLeads
      .filter((lead) => lead.payment_status !== "paid")
      .reduce((total, lead) => total + getLeadOutstandingAmount(lead), 0);
    const monthServiceRevenue = Object.values(
      monthDoneLeads.reduce((accumulator, lead) => {
        const key = formatServiceName(lead.services?.name || "Без услуги");
        if (!accumulator[key]) {
          accumulator[key] = { name: key, count: 0, total: 0 };
        }
        accumulator[key].count += 1;
        accumulator[key].total += getLeadAmount(lead);
        return accumulator;
      }, {})
    ).sort((a, b) => b.total - a.total);

    const periodSummaries = [
      { key: "day", label: "За день" },
      { key: "week", label: "За неделю" },
      { key: "month", label: "За месяц" },
      { key: "year", label: "За год" }
    ].map((period) => {
      const start = getRangeStart(now, period.key);
      const periodLeads = visibleLeads.filter((lead) => isDateInRange(lead.created_at, start, now));
      const periodDoneLeads = visibleLeads.filter(
        (lead) => ["done", "delivered"].includes(getLeadStageKey(lead.status)) && isDateInRange(lead.updated_at || lead.created_at, start, now)
      );
      const revenue = periodDoneLeads.reduce((total, lead) => total + getLeadAmount(lead), 0);
      const doneCount = periodDoneLeads.length;

      return {
        ...period,
        leadsCount: periodLeads.length,
        doneCount,
        revenue,
        averageTicket: doneCount ? revenue / doneCount : 0
      };
    });

    const paymentPeriodSummaries = [
      { key: "day", label: "За день" },
      { key: "week", label: "За неделю" },
      { key: "month", label: "За месяц" },
      { key: "year", label: "За год" }
    ].map((period) => {
      const start = getRangeStart(now, period.key);
      const paidLeads = visibleLeads.filter(
        (lead) => lead.payment_status !== "unpaid" && lead.paid_at && isDateInRange(lead.paid_at, start, now)
      );
      const scopedLeads = visibleLeads.filter((lead) => getLeadStageKey(lead.status) !== "lost" && isDateInRange(lead.created_at, start, now));

      return {
        ...period,
        paidRevenue: paidLeads.reduce((total, lead) => total + getLeadPaidAmount(lead), 0),
        outstandingRevenue: scopedLeads.reduce((total, lead) => total + getLeadOutstandingAmount(lead), 0),
        partialCount: scopedLeads.filter((lead) => lead.payment_status === "partial").length,
        unpaidCount: scopedLeads.filter((lead) => lead.payment_status === "unpaid").length,
        cashRevenue: paidLeads.filter((lead) => lead.payment_method === "cash").reduce((total, lead) => total + getLeadPaidAmount(lead), 0),
        cardRevenue: paidLeads.filter((lead) => lead.payment_method === "card").reduce((total, lead) => total + getLeadPaidAmount(lead), 0),
        transferRevenue: paidLeads.filter((lead) => lead.payment_method === "transfer").reduce((total, lead) => total + getLeadPaidAmount(lead), 0)
      };
    });

    return {
      clientsCount,
      todayLeads,
      newCount,
      followUpCount,
      openTasks,
      monthRevenue,
      monthPaidRevenue,
      monthOutstandingRevenue,
      monthPaidLeads,
      monthPartialLeads,
      monthUnpaidLeads,
      monthDebtLeadsRevenue,
      monthClosedLeads,
      monthAverageTicket,
      monthServiceRevenue,
      periodSummaries,
      paymentPeriodSummaries
    };
  }, [clients.length, visibleLeads]);

  function ensureCompanyWritable(targetCompanyId = activeCompanyId) {
    if (isPlatformAdmin) {
      return true;
    }

    const scopedCompany =
      companies.find((company) => company.id === targetCompanyId) ||
      (currentCompany?.id === targetCompanyId ? currentCompany : currentCompany) ||
      null;

    if (!scopedCompany || scopedCompany.status === "active") {
      return true;
    }

    setError(getCompanyReadOnlyMessage(scopedCompany));
    return false;
  }

  function resolveScopedCompanyId(explicitCompanyId = null, operationLabel = "Операция") {
    const scopedCompanyId = explicitCompanyId || activeCompanyId || null;

    if (!scopedCompanyId) {
      throw new Error(`${operationLabel}: не выбрана активная компания.`);
    }

    return scopedCompanyId;
  }

  async function saveCompanySettings(input) {
    if (!currentCompany?.id) {
      setError("Сначала выберите активную компанию.");
      return false;
    }

    if (!ensureCompanyWritable(currentCompany.id)) {
      return false;
    }

    setCompanySaving(true);
    setError("");
    setSaveMessage("");

    try {
      const normalizedSlug = slugifyCompanyName(input.slug || input.name);
      if (!normalizedSlug) {
        throw new Error("Укажите корректный slug компании.");
      }

      const payload = {
        name: input.name.trim(),
        slug: normalizedSlug,
        business_type: input.business_type || "detailing",
        contact_phone: input.contact_phone.trim() || null,
        contact_email: input.contact_email.trim() || null,
        plan_code: input.plan_code || "starter"
      };

      const { data: updatedCompany, error: updateError } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", currentCompany.id)
          .select("id, name, slug, is_demo, business_type, status, contact_phone, contact_email, plan_code, created_at")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updatedCompany?.id) {
        throw new Error("Не удалось обновить компанию.");
      }

      setCompanies((current) =>
        current.map((company) => (company.id === updatedCompany.id ? { ...company, ...updatedCompany } : company))
      );
      setSaveMessage("Компания обновлена.");
      return true;
    } catch (saveError) {
      setError(saveError.message || "Не удалось сохранить компанию.");
      return false;
    } finally {
      setCompanySaving(false);
    }
  }

  async function saveCompanySubscription(companyId, input) {
    if (!companyId) {
      setError("Компания не выбрана.");
      return false;
    }

    setSubscriptionSavingId(companyId);
    setError("");
    setSaveMessage("");

    try {
      const previousCompany = companies.find((company) => company.id === companyId) || null;
      const previousSubscription = companySubscriptions.find((subscription) => subscription.company_id === companyId) || null;
      const companyPayload = {
        status: input.status || "active",
        plan_code: input.plan_code || "starter"
      };

      const { data: updatedCompany, error: companyError } = await supabase
        .from("companies")
        .update(companyPayload)
        .eq("id", companyId)
        .select("id, name, slug, is_demo, business_type, status, contact_phone, contact_email, plan_code, created_at")
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      const subscriptionPayload = {
        company_id: companyId,
        plan_code: input.plan_code || "starter",
        billing_status: input.billing_status || "trial",
        price_monthly: input.price_monthly == null || Number.isNaN(Number(input.price_monthly)) ? null : Number(input.price_monthly),
        starts_at: input.starts_at || null,
        trial_ends_at: input.trial_ends_at || null,
        renews_at: input.renews_at || null,
        ends_at: input.ends_at || null,
        notes: input.notes || null
      };

      const { data: updatedSubscription, error: subscriptionError } = await supabase
        .from("company_subscriptions")
        .upsert(subscriptionPayload, { onConflict: "company_id" })
        .select("*")
        .maybeSingle();

      if (subscriptionError) {
        throw subscriptionError;
      }

      if (updatedCompany) {
        setCompanies((current) => current.map((company) => (company.id === companyId ? { ...company, ...updatedCompany } : company)));
      }

      if (updatedSubscription) {
        setCompanySubscriptions((current) => {
          const exists = current.some((subscription) => subscription.company_id === companyId);
          if (exists) {
            return current.map((subscription) =>
              subscription.company_id === companyId ? { ...subscription, ...updatedSubscription } : subscription
            );
          }

          return [...current, updatedSubscription];
        });

        const statusChanged = previousCompany?.status && previousCompany.status !== (updatedCompany?.status || companyPayload.status);
        const planChanged = (previousSubscription?.plan_code || previousCompany?.plan_code || "starter") !== updatedSubscription.plan_code;
        const billingChanged = (previousSubscription?.billing_status || "trial") !== updatedSubscription.billing_status;
        const eventType = statusChanged
          ? "status_changed"
          : planChanged
          ? "plan_changed"
          : billingChanged
          ? "billing_changed"
          : previousSubscription
          ? "updated"
          : "created";
        const noteParts = [];

        if (statusChanged) {
          noteParts.push(`статус: ${formatCompanyStatus(previousCompany?.status)} -> ${formatCompanyStatus(updatedCompany?.status || companyPayload.status)}`);
        }
        if (planChanged) {
          noteParts.push(`тариф: ${planLabels[previousSubscription?.plan_code || previousCompany?.plan_code || "starter"] || previousSubscription?.plan_code || previousCompany?.plan_code || "starter"} -> ${planLabels[updatedSubscription.plan_code] || updatedSubscription.plan_code}`);
        }
        if (billingChanged) {
          noteParts.push(`биллинг: ${formatBillingStatus(previousSubscription?.billing_status || "trial")} -> ${formatBillingStatus(updatedSubscription.billing_status)}`);
        }

        const eventPayload = {
          status: updatedCompany?.status || companyPayload.status,
          plan_code: updatedSubscription.plan_code,
          billing_status: updatedSubscription.billing_status,
          price_monthly: updatedSubscription.price_monthly,
          starts_at: updatedSubscription.starts_at,
          trial_ends_at: updatedSubscription.trial_ends_at,
          renews_at: updatedSubscription.renews_at,
          ends_at: updatedSubscription.ends_at,
          ...(input.event_payload_extra || {})
        };
        const finalEventType = input.event_type_override || eventType;
        const finalEventNote = input.event_note_override || noteParts.join(" | ") || "Подписка компании обновлена.";

        const { data: createdEvent, error: eventError } = await supabase
          .from("company_subscription_events")
          .insert({
            company_id: companyId,
            subscription_id: updatedSubscription.id,
            event_type: finalEventType,
            note: finalEventNote,
            payload: eventPayload,
            created_by: session.user.id
          })
          .select("*")
          .maybeSingle();

        if (eventError) {
          throw eventError;
        }

        if (createdEvent) {
          setCompanySubscriptionEvents((current) => [createdEvent, ...current]);
        }
      }

      setSaveMessage("Статус компании и подписка сохранены.");
      return true;
    } catch (saveError) {
      setError(saveError.message || "Не удалось сохранить подписку компании.");
      return false;
    } finally {
      setSubscriptionSavingId(null);
    }
  }

  async function updatePlatformDemoRequestStatus(requestId, input) {
    setDemoRequestSavingId(requestId);
    setError("");
    setSaveMessage("");

    try {
      const previousRequest = platformDemoRequests.find((request) => request.id === requestId) || null;
      const nextStatus = input?.status || previousRequest?.status || "new";
      const nextCompanyId = input?.connected_company_id || null;
      const linkedCompany = companies.find((company) => company.id === nextCompanyId) || null;
      const previousMeta = getDemoRequestMeta(previousRequest);
      const nextMeta =
        input?.meta_patch && typeof input.meta_patch === "object"
          ? { ...previousMeta, ...input.meta_patch }
          : previousMeta;
      const nextPatch = {
        status: nextStatus,
        connected_company_id: nextCompanyId,
        company_name: linkedCompany?.name || previousRequest?.company_name || null,
        meta: nextMeta,
        updated_at: new Date().toISOString()
      };
      const timestampField = demoRequestStatusTimestampFields[nextStatus];

      if (timestampField && !previousRequest?.[timestampField]) {
        nextPatch[timestampField] = new Date().toISOString();
      }

      const { data, error: updateError } = await supabase
        .from("platform_demo_requests")
        .update(nextPatch)
        .eq("id", requestId)
        .select("*")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (data) {
        setPlatformDemoRequests((current) => current.map((request) => (request.id === requestId ? data : request)));
      }

      setSaveMessage(nextCompanyId ? "Демо-заявка обновлена и связана с компанией." : "Статус демо-заявки обновлён.");
      return true;
    } catch (updateRequestError) {
      setError(updateRequestError.message || "Не удалось обновить демо-заявку.");
      return false;
    } finally {
      setDemoRequestSavingId(null);
    }
  }

  async function createManualPlatformLead(input) {
    setError("");
    setSaveMessage("");

    try {
      const companyName = String(input?.company_name || "").trim();
      const contactName = String(input?.name || "").trim();
      const phone = String(input?.phone || "").trim();
      const ownerEmail = String(input?.owner_email || "").trim().toLowerCase();

      if (!companyName || !contactName || !phone || !ownerEmail) {
        throw new Error("Нужно заполнить компанию, имя, телефон и email owner.");
      }

      const normalizedBusinessType = input?.business_type || "detailing";
      const normalizedRole = "owner";
      const normalizedPlan = input?.plan || "basic";
      const normalizedBilling = "free_month";

      const requestPayload = {
        name: contactName,
        phone,
        business_type: normalizedBusinessType,
        company_name: companyName,
        employees_count: null,
        locations_count: null,
        comment: null,
        meta: {
          role: normalizedRole,
          plan: normalizedPlan,
          billing: normalizedBilling,
          owner_email: ownerEmail || null,
          team_size: null,
          locations_count: null,
          company_name: companyName,
          manual_entry: true
        },
        source: "manual",
        status: "new",
        is_demo: false
      };

      const { data, error: insertError } = await supabase
        .from("platform_demo_requests")
        .insert(requestPayload)
        .select("*")
        .maybeSingle();

      if (insertError) {
        throw insertError;
      }

      if (!data?.id) {
        throw new Error("Не удалось создать real owner lead.");
      }

      setPlatformDemoRequests((current) => [data, ...current]);
      setSaveMessage("Реальный owner lead добавлен в creator queue.");
      return data;
    } catch (createError) {
      setError(createError.message || "Не удалось создать real owner lead.");
      return null;
    }
  }

  async function seedCompanyServicePack(companyId, businessType = "detailing", existingServicesOverride = null) {
    const presets = getDemoServicePresets(businessType || "detailing");
    const existingServices = existingServicesOverride || services.filter((service) => service.company_id === companyId);

    for (const preset of presets) {
      const existing = existingServices.find((service) => String(service.name || "").toLowerCase() === preset.name.toLowerCase());

      if (existing) {
        const { error: updateError } = await supabase
          .from("services")
          .update({
            base_price: preset.base_price,
            duration_minutes: preset.duration_minutes,
            is_active: true
          })
          .eq("id", existing.id)
          .eq("company_id", companyId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase.from("services").insert({
          company_id: companyId,
          name: preset.name,
          base_price: preset.base_price,
          duration_minutes: preset.duration_minutes,
          is_active: true
        });

        if (insertError) {
          throw insertError;
        }
      }
    }
  }

  async function createCompanyFromDemoRequest(requestId) {
    if (!requestId) {
      return false;
    }

    setDemoRequestSavingId(requestId);
    setError("");
    setSaveMessage("");

    try {
      const request = platformDemoRequests.find((item) => item.id === requestId) || null;
      if (!request) {
        throw new Error("Демо-заявка не найдена.");
      }

      if (request.connected_company_id) {
        throw new Error("Эта заявка уже связана с компанией.");
      }

      const companyName = (request.company_name || request.name || "").trim();
      if (!companyName) {
        throw new Error("В заявке нет названия компании.");
      }

      const commerceSnapshot = getDemoRequestCommerceSnapshot(request);
      const storefrontPlanId = String(commerceSnapshot.plan || "").trim().toLowerCase();
      const billingPeriod = commerceSnapshot.billing || "monthly";
      const recommendedPlanCode = storefrontPlanToCompanyPlan[storefrontPlanId] || "starter";
      const recommendedPlanConfig = getStorefrontPlanConfig(storefrontPlanId, billingPeriod);
      const monthlyPrice =
        recommendedPlanConfig?.price && recommendedPlanConfig.price !== "Free"
          ? Number(recommendedPlanConfig.price.replace("€", "").replace(",", ".").trim())
          : 0;
      const ownerEmail = String(commerceSnapshot.ownerEmail || "").trim().toLowerCase();
      const isFastFreeMonth = billingPeriod === "free_month";
      const trialDays = billingPeriod === "free_month" ? 30 : 7;
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
      const initialNotes = [
        `Storefront handoff: ${formatStorefrontPlanLabel(storefrontPlanId)} / ${formatDemoBillingPeriod(billingPeriod)}`,
        request.phone ? `Контакт: ${request.phone}` : "",
        ownerEmail ? `Email: ${ownerEmail}` : "",
        commerceSnapshot.role ? `Роль: ${commerceSnapshot.role}` : "",
        commerceSnapshot.teamSize ? `Команда: ${commerceSnapshot.teamSize}` : "",
        commerceSnapshot.locations ? `Локации: ${commerceSnapshot.locations}` : ""
      ]
        .filter(Boolean)
        .join(" | ");

      const companyPayload = {
        name: companyName,
        slug: makeUniqueCompanySlug(companyName, companies),
        is_demo: false,
        business_type: request.business_type || "detailing",
        contact_phone: request.phone?.trim() || null,
        contact_email: ownerEmail || null,
        plan_code: recommendedPlanCode,
        status: isFastFreeMonth ? "active" : "paused"
      };

      const { data: createdCompany, error: companyError } = await supabase
        .from("companies")
        .insert(companyPayload)
        .select("id, name, slug, is_demo, business_type, status, contact_phone, contact_email, plan_code, created_at")
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (!createdCompany?.id) {
        throw new Error("Не удалось создать компанию из заявки.");
      }

      const { data: createdSubscription, error: subscriptionError } = await supabase
        .from("company_subscriptions")
        .insert({
          company_id: createdCompany.id,
          plan_code: recommendedPlanCode,
          billing_status: "trial",
          price_monthly: Number.isFinite(monthlyPrice) ? monthlyPrice : null,
          trial_ends_at: trialEndsAt,
          notes: initialNotes || null
        })
        .select("*")
        .maybeSingle();

      if (subscriptionError) {
        throw subscriptionError;
      }

      if (createdSubscription?.id) {
        const { data: subscriptionEvent, error: eventError } = await supabase
          .from("company_subscription_events")
          .insert({
            company_id: createdCompany.id,
            subscription_id: createdSubscription.id,
            event_type: "created",
            note: "Подписка создана из storefront demo-request.",
            payload: {
              status: isFastFreeMonth ? "active" : "paused",
              plan_code: recommendedPlanCode,
              billing_status: "trial",
              billing_period: billingPeriod,
              price_monthly: Number.isFinite(monthlyPrice) ? monthlyPrice : null,
              trial_ends_at: trialEndsAt,
              owner_email: ownerEmail || null,
              requested_role: commerceSnapshot.role || null,
              requested_team_size: commerceSnapshot.teamSize || null,
              requested_locations_count: commerceSnapshot.locations || null,
              source_request_id: request.id
            },
            created_by: session.user.id
          })
          .select("*")
          .maybeSingle();

        if (eventError) {
          throw eventError;
        }

        if (subscriptionEvent) {
          setCompanySubscriptionEvents((current) => [subscriptionEvent, ...current]);
        }
      }

      await seedCompanyServicePack(createdCompany.id, createdCompany.business_type || request.business_type || "detailing", []);

      const requestStatus = isFastFreeMonth
        ? "connected"
        : request.status === "connected" || request.status === "qualified"
          ? request.status
          : "qualified";
      const requestPatch = {
        status: requestStatus,
        connected_company_id: createdCompany.id,
        company_name: createdCompany.name,
        updated_at: new Date().toISOString()
      };

      if ((requestStatus === "qualified" || requestStatus === "connected") && !request.qualified_at) {
        requestPatch.qualified_at = new Date().toISOString();
      }
      if (requestStatus === "connected" && !request.connected_at) {
        requestPatch.connected_at = new Date().toISOString();
      }

      const { data: updatedRequest, error: requestError } = await supabase
        .from("platform_demo_requests")
        .update(requestPatch)
        .eq("id", request.id)
        .select("*")
        .maybeSingle();

      if (requestError) {
        throw requestError;
      }

      if (updatedRequest) {
        setPlatformDemoRequests((current) => current.map((item) => (item.id === request.id ? updatedRequest : item)));
      }

      const ownerAccessResult = await ensureOwnerAccessForCompany(createdCompany, request);
      const starterAccessEntries = await ensureStarterCoverageFromRequest(
        createdCompany,
        request,
        commerceSnapshot,
        billingPeriod
      );
      const accessItems = [
        ...(ownerAccessResult?.item ? [ownerAccessResult.item] : []),
        ...starterAccessEntries
      ];

      if (accessItems.length) {
        setStarterAccessByCompany((current) => ({
          ...current,
          [createdCompany.id]: [...accessItems, ...(current[createdCompany.id] || [])].slice(0, 6)
        }));
      }

      await loadData(null);
      setActiveView("companies");
      setCompanyMode("paid");
      setFocusedCompanyId(createdCompany.id);
      const createdRoleLabels = starterAccessEntries
        .map((item) => roleLabels[item.role] || item.role)
        .filter(Boolean)
        .join(", ");
      setSaveMessage(
        billingPeriod === "free_month"
          ? createdRoleLabels
            ? `Компания, бесплатный месяц, active-статус, owner login и роли ${createdRoleLabels} созданы из owner lead.`
            : ownerAccessResult?.item
            ? "Компания, бесплатный месяц, active-статус, owner login и стартовый пакет созданы из owner lead."
            : "Компания, бесплатный месяц, active-статус и стартовый пакет услуг созданы из owner lead."
          : createdRoleLabels
          ? `Компания, стартовый trial, пакет услуг и роли ${createdRoleLabels} созданы из owner lead.`
          : ownerAccessResult?.item
          ? "Компания, стартовый trial, пакет услуг и owner login созданы из owner lead."
          : "Компания, стартовый trial и пакет услуг созданы из owner lead."
      );
      return true;
    } catch (createError) {
      setError(createError.message || "Не удалось создать компанию из демо-заявки.");
      return false;
    } finally {
      setDemoRequestSavingId(null);
    }
  }

  async function applyCompanyServicePack(companyId, businessType = "detailing") {
    if (!companyId) {
      return false;
    }

    setCompanyPackApplyingId(companyId);
    setError("");
    setSaveMessage("");

    try {
      await seedCompanyServicePack(companyId, businessType);
      await loadData(selectedLeadId);
      setSaveMessage(`Базовые услуги для ниши "${businessTypeLabels[businessType] || "Детейлинг"}" загружены в компанию.`);
      return true;
    } catch (applyError) {
      setError(applyError.message || "Не удалось загрузить сервисный пакет компании.");
      return false;
    } finally {
      setCompanyPackApplyingId(null);
    }
  }

  async function loadCompanyRoleCoverage(companyId) {
    const { data: membersData, error: membersError } = await supabase
      .from("company_members")
      .select("user_id, role, is_active, created_at")
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (membersError) {
      throw membersError;
    }

    const userIds = [...new Set((membersData || []).map((item) => item.user_id).filter(Boolean))];
    const { data: profilesData, error: profilesError } = userIds.length
      ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      : { data: [], error: null };

    if (profilesError) {
      throw profilesError;
    }

    const profilesById = new Map((profilesData || []).map((profileItem) => [profileItem.id, profileItem]));
    const coverage = new Map();

    for (const member of membersData || []) {
      if (!coverage.has(member.role)) {
        coverage.set(member.role, {
          ...member,
          profile: profilesById.get(member.user_id) || null
        });
      }
    }

    return coverage;
  }

  async function createPlatformStarterAccess(companyId, role) {
    const company = companies.find((item) => item.id === companyId) || null;
    if (!company) {
      setError("Компания не найдена.");
      return false;
    }

    setStarterAccessCreatingId(companyId);
    setError("");
    setSaveMessage("");

    try {
      const roleCoverage = await loadCompanyRoleCoverage(companyId);
      const existingRole = roleCoverage.get(role);
      if (existingRole) {
        const existingLabel = existingRole.profile?.email || existingRole.profile?.full_name || roleLabels[role] || role;
        setSaveMessage(`${roleLabels[role] || role} уже подключён: ${existingLabel}.`);
        return true;
      }

      const credentials = buildPlatformStarterCredentials(company, role);
      await createCompanyMemberAccount(companyId, credentials, {
        syncToCurrentTeam: false,
        successMessage: "Стартовый доступ создан."
      });

      setStarterAccessByCompany((current) => ({
        ...current,
        [companyId]: [
          {
            role,
            email: credentials.email,
            password: credentials.password,
            full_name: credentials.full_name,
            created_at: new Date().toISOString()
          },
          ...(current[companyId] || [])
        ].slice(0, 6)
      }));

      await loadData(null);
      setSaveMessage(`Создан доступ ${roleLabels[role] || role} для ${company.name}.`);
      return true;
    } catch (createError) {
      setError(createError.message || "Не удалось создать стартовый доступ.");
      return false;
    } finally {
      setStarterAccessCreatingId(null);
    }
  }

  async function createPlatformStarterBundle(companyId) {
    const company = companies.find((item) => item.id === companyId) || null;
    if (!company) {
      setError("Компания не найдена.");
      return false;
    }

    setStarterAccessCreatingId(companyId);
    setError("");
    setSaveMessage("");

    try {
      const roleCoverage = await loadCompanyRoleCoverage(companyId);
      const missingRoles = ["owner", "manager", "detailer"].filter((role) => !roleCoverage.has(role));

      if (!missingRoles.length) {
        setSaveMessage(`Для ${company.name} уже есть owner / manager / master.`);
        return true;
      }

      const createdEntries = [];

      for (const role of missingRoles) {
        const credentials = buildPlatformStarterCredentials(company, role);
        await createCompanyMemberAccount(companyId, credentials, {
          syncToCurrentTeam: false,
          successMessage: "Стартовый доступ создан."
        });
        createdEntries.push({
          role,
          email: credentials.email,
          password: credentials.password,
          full_name: credentials.full_name,
          created_at: new Date().toISOString()
        });
      }

      setStarterAccessByCompany((current) => ({
        ...current,
        [companyId]: [...createdEntries, ...(current[companyId] || [])].slice(0, 6)
      }));

      await loadData(null);
      setSaveMessage(`Создан стартовый набор для ${company.name}: ${missingRoles.map((role) => roleLabels[role] || role).join(", ")}.`);
      return true;
    } catch (createError) {
      setError(createError.message || "Не удалось создать стартовый набор доступов.");
      return false;
    } finally {
      setStarterAccessCreatingId(null);
    }
  }

  async function ensureStarterCoverageFromRequest(company, request, commerceSnapshot = {}, billingPeriod = "monthly") {
    if (!company?.id) {
      return [];
    }

    const roleCoverage = await loadCompanyRoleCoverage(company.id);
    const targetRoles = resolveRequestStarterRoles(request, commerceSnapshot, billingPeriod);
    const missingRoles = targetRoles.filter((role) => !roleCoverage.has(role));

    if (!missingRoles.length) {
      return [];
    }

    const createdEntries = [];

    for (const role of missingRoles) {
      const credentials = buildPlatformStarterCredentials(company, role);
      await createCompanyMemberAccount(company.id, credentials, {
        syncToCurrentTeam: false,
        successMessage: "Стартовый доступ создан."
      });
      createdEntries.push({
        role,
        email: credentials.email,
        password: credentials.password,
        full_name: credentials.full_name,
        created_at: new Date().toISOString(),
        note: "Создано автоматически из owner lead"
      });
    }

    return createdEntries;
  }

  async function applyPlatformFullLaunchBundle(companyId, options = {}) {
    const launchOk = await applyPlatformLaunchBundle(companyId, options);
    if (!launchOk) {
      return false;
    }

    const starterOk = await createPlatformStarterBundle(companyId);
    if (!starterOk) {
      return false;
    }

    const company = companies.find((item) => item.id === companyId) || null;
    if (company?.name) {
      setSaveMessage(`Полный launch bundle закрыт для ${company.name}: active, billing, service pack и стартовые доступы готовы.`);
    }

    return true;
  }

  async function applyPlatformLaunchBundle(companyId, options = {}) {
    const company = companies.find((item) => item.id === companyId) || null;
    if (!company) {
      setError("Компания не найдена.");
      return false;
    }

    const subscription = companySubscriptions.find((item) => item.company_id === companyId) || null;
    const mode = options.mode || "trial";
    const nextPlanCode = options.plan_code || subscription?.plan_code || company.plan_code || "starter";
    const now = new Date();
    const nextTrial = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const nextRenewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const nextEnd = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const existingNotes = subscription?.notes?.trim() || "";
    const noteTag =
      mode === "manual"
        ? "Creator launch bundle: active + manual + service pack"
        : "Creator launch bundle: active + trial/free month + service pack";

    setLaunchBundleSavingId(companyId);
    setError("");
    setSaveMessage("");

    try {
      const saveOk = await saveCompanySubscription(companyId, {
        status: "active",
        plan_code: nextPlanCode,
        billing_status: mode === "manual" ? "manual" : "trial",
        price_monthly: subscription?.price_monthly ?? options.price_monthly ?? null,
        starts_at: subscription?.starts_at || now.toISOString().slice(0, 16),
        trial_ends_at: mode === "trial" ? nextTrial : null,
        renews_at: mode === "manual" ? (subscription?.renews_at ? formatDateTimeLocal(subscription.renews_at) : nextRenewal) : subscription?.renews_at ? formatDateTimeLocal(subscription.renews_at) : null,
        ends_at: subscription?.ends_at ? formatDateTimeLocal(subscription.ends_at) : nextEnd,
        notes: [existingNotes, noteTag].filter(Boolean).join(" | ")
      });

      if (!saveOk) {
        return false;
      }

      const servicePackOk = await applyCompanyServicePack(companyId, company.business_type || "detailing");
      if (!servicePackOk) {
        return false;
      }

      if (options.requestId) {
        await updatePlatformDemoRequestStatus(options.requestId, {
          status: "connected",
          connected_company_id: companyId
        });
      }

      setSaveMessage(
        mode === "manual"
          ? `Компания ${company.name} переведена в active + manual, сервисный пакет загружен.`
          : `Компания ${company.name} переведена в active + trial/free month, сервисный пакет загружен.`
      );
      return true;
    } catch (bundleError) {
      setError(bundleError.message || "Не удалось применить launch bundle.");
      return false;
    } finally {
      setLaunchBundleSavingId(null);
    }
  }

  const defaultRoute = isPlatformAdmin ? "/platform" : permissions.nav[0] || "/dashboard";
  const leadsEmptyMessage =
    role === "detailer"
      ? "Назначенных заявок пока нет. Как только менеджер назначит работу, она появится здесь."
      : "Пока нет заявок. Создайте первую, и pipeline заполнится автоматически.";

  if (loading) {
    return <div className="loading-screen">Загружаем систему...</div>;
  }

  if (!companyMemberships.length && !isPlatformAdmin) {
    return (
      <CompanyOnboardingPage
        userEmail={session.user.email}
        saving={companyCreating}
        onCreateCompany={createCompanyWorkspace}
      />
    );
  }

  return (
    <AppLayout
      session={session}
      metrics={metrics}
      role={role}
      isPlatformAdmin={isPlatformAdmin}
      onSignOut={onSignOut}
      currentUserName={profile?.full_name || session.user.email}
      companies={companies}
      activeCompanyId={activeCompanyId}
      onCompanyChange={handleCompanyChange}
    >
      {error ? <div className="notice notice-error">{error}</div> : null}
      {saveMessage ? <div className="notice notice-success">{saveMessage}</div> : null}
      {!isPlatformAdmin && currentCompanyIsReadOnly ? <div className="notice notice-error">{currentCompanyReadOnlyMessage}</div> : null}

      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route path="/app" element={<Navigate to={defaultRoute} replace />} />
        {isPlatformAdmin ? (
          <Route
            path="/platform"
            element={
              <PlatformOverviewPage
                companies={companies}
                subscriptions={companySubscriptions}
                demoRequests={platformDemoRequests}
              subscriptionEvents={companySubscriptionEvents}
              subscriptionSavingId={subscriptionSavingId}
              demoRequestSavingId={demoRequestSavingId}
              companyPackApplyingId={companyPackApplyingId}
              launchBundleSavingId={launchBundleSavingId}
              starterAccessCreatingId={starterAccessCreatingId}
              starterAccessByCompany={starterAccessByCompany}
              accessibleCompanyIds={new Set()}
              onOpenCompany={openCompanyWorkspace}
              onSaveCompanySubscription={saveCompanySubscription}
              onUpdateDemoRequestStatus={updatePlatformDemoRequestStatus}
              onCreateCompanyFromDemoRequest={createCompanyFromDemoRequest}
              onCreateManualPlatformLead={createManualPlatformLead}
              onApplyCompanyServicePack={applyCompanyServicePack}
              onApplyPlatformLaunchBundle={applyPlatformLaunchBundle}
              onApplyPlatformFullLaunchBundle={applyPlatformFullLaunchBundle}
              onCreatePlatformStarterAccess={createPlatformStarterAccess}
              onCreatePlatformStarterBundle={createPlatformStarterBundle}
            />
          }
        />
        ) : null}
        {permissions.nav.includes("/dashboard") ? (
          <Route
            path="/dashboard"
            element={
              role === "owner" ? (
                <DashboardPage
                  metrics={metrics}
                  leads={visibleLeads}
                  businessType={currentCompany?.business_type || "detailing"}
                  onOpenLead={setSelectedLeadId}
                />
              ) : role === "manager" ? (
                <ManagerDashboardPage
                  metrics={metrics}
                  leads={visibleLeads}
                  businessType={currentCompany?.business_type || "detailing"}
                  onOpenLead={setSelectedLeadId}
                />
              ) : (
                <DetailerDashboardPage
                  metrics={metrics}
                  leads={visibleLeads}
                  businessType={currentCompany?.business_type || "detailing"}
                  onOpenLead={setSelectedLeadId}
                />
              )
            }
          />
        ) : null}
        {permissions.nav.includes("/leads") ? (
          <Route
            path="/leads"
            element={
              <LeadsPage
                leads={visibleLeads}
                leadEvents={visibleLeadEvents}
                attachments={visibleAttachments}
                services={services}
                businessType={currentCompany?.business_type || "detailing"}
                detailerProfiles={detailerProfiles}
                currentUserName={profile?.full_name || session.user.email}
                permissions={permissions}
                emptyMessage={leadsEmptyMessage}
                selectedLeadId={selectedLeadId}
                setSelectedLeadId={setSelectedLeadId}
                createLead={createLead}
                creatingLead={creatingLead}
            statusSavingId={statusSavingId}
            updateLeadStatus={updateLeadStatus}
            updateLeadAssignee={updateLeadAssignee}
            updateLeadPayment={updateLeadPayment}
            updateLeadFollowUp={updateLeadFollowUp}
            addLeadNote={addLeadNote}
            createLeadAttachment={createLeadAttachment}
                updateAttachmentVisibility={updateAttachmentVisibility}
                deleteAttachment={deleteAttachment}
                onPhoneAction={handlePhoneAction}
              />
            }
          />
        ) : null}
        {permissions.nav.includes("/clients") ? (
          <Route
            path="/clients"
            element={
              <ClientsPage
                clients={clients}
                leads={visibleLeads}
                leadEvents={visibleLeadEvents}
                businessType={currentCompany?.business_type || "detailing"}
                onPhoneAction={handlePhoneAction}
              />
            }
          />
        ) : null}
        {permissions.nav.includes("/tasks") ? (
          <Route path="/tasks" element={<TasksPage leads={visibleLeads} businessType={currentCompany?.business_type || "detailing"} />} />
        ) : null}
        {permissions.nav.includes("/settings") ? (
          <Route
            path="/settings"
            element={
              <LiveSettingsPage
                webhookEnabled={Boolean(import.meta.env.VITE_AUTOMATION_WEBHOOK_URL)}
                role={role}
                profile={profile}
                currentCompany={currentCompany}
                teamProfiles={teamProfiles}
                services={services}
                profileSaving={profileSaving}
                companySaving={companySaving}
                teamSaving={teamSaving}
                serviceSavingId={serviceSavingId}
                creatingTeamMember={creatingTeamMember}
                creatingService={creatingService}
                applyingDemoPricing={applyingDemoPricing}
                passwordSaving={passwordSaving}
                onSaveProfile={saveProfileSettings}
                onSaveCompany={saveCompanySettings}
                onUpdateTeamMember={updateTeamMember}
                onDeleteTeamMember={deleteTeamMember}
                onCreateTeamMember={createTeamMember}
                onUpdateService={updateServiceSettings}
                onCreateService={createServiceSettings}
                onApplyDemoPricing={applyDemoPricing}
                onChangePassword={changePassword}
              />
            }
          />
        ) : null}
        <Route path="/services" element={<Navigate to="/leads" replace />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const isMarketingHomeRoute = location.pathname === "/";
  const isMarketingCatalogRoute = location.pathname === "/catalog" || location.pathname === "/features";
  const isMarketingPricingRoute = location.pathname === "/pricing";
  const isMarketingBlogRoute = location.pathname === "/blog" || location.pathname === "/demo";
  const legalPageMatch = /^\/(site-policy|terms|privacy|cookies)$/.exec(location.pathname);
  const legalPageKey = legalPageMatch?.[1] || "";
  const isMarketingLegalRoute = Boolean(legalPageKey);
  const isLoginRoute = location.pathname === "/login";
  const isPublicRequestRoute = location.pathname === "/request";
  const isPublicCompanyRoute = /^\/s\/[^/]+$/.test(location.pathname);
  const isPublicStatusRoute = /^\/status\/[^/]+$/.test(location.pathname);
  const publicStatusToken = isPublicStatusRoute ? location.pathname.split("/status/")[1] : "";
  const isPublicRoute =
    isMarketingHomeRoute ||
    isMarketingCatalogRoute ||
    isMarketingPricingRoute ||
    isMarketingBlogRoute ||
    isMarketingLegalRoute ||
    isLoginRoute ||
    isPublicCompanyRoute ||
    isPublicRequestRoute ||
    isPublicStatusRoute;

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setBooting(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setBooting(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (booting && !isPublicRoute) {
    return <div className="loading-screen">Подготавливаем рабочее пространство...</div>;
  }

  if (isMarketingHomeRoute) {
    return <MarketingHomePage session={session} />;
  }

  if (isMarketingCatalogRoute) {
    return <MarketingFeaturesPage session={session} />;
  }

  if (isMarketingPricingRoute) {
    return <MarketingPricingPage session={session} />;
  }

  if (isMarketingBlogRoute) {
    return <MarketingDemoPage session={session} />;
  }

  if (isMarketingLegalRoute) {
    return <MarketingLegalPage session={session} pageKey={legalPageKey} />;
  }

  if (isLoginRoute) {
    if (session) {
      return <Navigate to="/app" replace />;
    }

    return <LoginPage onAuthenticated={setSession} />;
  }

  if (isPublicRequestRoute) {
    return <PublicRequestPage isAuthenticated={Boolean(session)} />;
  }

  if (isPublicCompanyRoute) {
    return <PublicCompanyPage />;
  }

  if (isPublicStatusRoute) {
    return <PublicStatusPage token={publicStatusToken} />;
  }

  if (!session) {
    return <LoginPage onAuthenticated={setSession} />;
  }

  return <ProtectedApp session={session} onSignOut={handleSignOut} />;
}
