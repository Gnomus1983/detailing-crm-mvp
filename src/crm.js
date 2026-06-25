export async function sendAutomationWebhook(webhookUrl, payload, fetchImpl = fetch) {
  if (!webhookUrl) {
    return { skipped: true };
  }

  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      sent_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`automation webhook failed with status ${response.status}`);
  }

  return { skipped: false };
}

export async function createLeadEvent(supabaseClient, eventInput) {
  return supabaseClient.from("lead_events").insert(eventInput).select().single();
}

function requireCompanyId(companyId, operationLabel) {
  if (!companyId) {
    throw new Error(`${operationLabel}: не выбрана активная компания.`);
  }

  return companyId;
}

export async function createOrReuseClient(supabaseClient, form, companyId = null) {
  const scopedCompanyId = requireCompanyId(companyId, "Создание клиента");
  const phone = form.phone.trim();
  const existingClientQuery = supabaseClient.from("clients").select("*").eq("phone", phone).eq("company_id", scopedCompanyId);

  const { data: existingClient, error: existingClientError } = await existingClientQuery.maybeSingle();

  if (existingClientError) {
    throw existingClientError;
  }

  const clientPayload = {
    name: form.client_name.trim(),
    phone,
    company_id: scopedCompanyId,
    email: form.email.trim() || null,
    car_make: form.car_make.trim() || null,
    car_model: form.car_model.trim() || null,
    car_year: form.car_year ? Number(form.car_year) : null,
    car_plate: form.car_plate.trim() || null,
    notes: form.comment.trim() || existingClient?.notes || null
  };

  const upsertBuilder = supabaseClient.from("clients").upsert(clientPayload, {
    onConflict: "company_id,phone"
  });

  const { data, error } = await upsertBuilder.select().single();

  if (error) {
    throw error;
  }

  return { client: data, reused: Boolean(existingClient) };
}

export async function createLeadRecord(supabaseClient, clientId, form, companyId = null) {
  const scopedCompanyId = requireCompanyId(companyId, "Создание заявки");
  const leadInsert = {
    client_id: clientId,
    company_id: scopedCompanyId,
    service_id: form.service_id || null,
    status: "new",
    source: form.source,
    address: form.address.trim() || null,
    comment: form.comment.trim() || null,
    preferred_date: form.preferred_date || null,
    preferred_time: form.preferred_time.trim() || null,
    estimated_price: form.estimated_price === "" ? null : Number(form.estimated_price),
    follow_up_at: form.follow_up_at ? new Date(form.follow_up_at).toISOString() : null
  };

  const { data, error } = await supabaseClient.from("leads").insert(leadInsert).select("*, clients(*), services(*)").single();

  if (error) {
    throw error;
  }

  return data;
}

export async function submitPublicLead(supabaseClient, form) {
  const companySlug = String(form.company_slug || "").trim();

  if (!companySlug) {
    throw new Error("Клиентская форма не привязана к компании.");
  }

  const { data, error } = await supabaseClient.functions.invoke("public-request", {
    body: {
      client_name: form.client_name,
      phone: form.phone,
      email: form.email,
      service_id: form.service_id || null,
      car_make: form.car_make,
      car_model: form.car_model,
      car_year: form.car_year,
      car_plate: form.car_plate,
      source: form.source || "landing",
      address: form.address,
      comment: form.comment,
      preferred_date: form.preferred_date || null,
      preferred_time: form.preferred_time,
      estimated_price: form.estimated_price,
      follow_up_at: form.follow_up_at || null,
      website: form.website || "",
      company_slug: companySlug
    }
  });

  if (error) {
    if (error.context && typeof error.context.json === "function") {
      try {
        const errorPayload = await error.context.json();
        if (errorPayload?.error) {
          throw new Error(errorPayload.error);
        }
      } catch {
        // ignore json parsing errors and fall back to generic message below
      }
    }

    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.result;
}

export async function updateLeadStatusRecord(supabaseClient, leadId, nextStatus, companyId = null) {
  const scopedCompanyId = requireCompanyId(companyId, "Обновление статуса");

  const query = supabaseClient
    .from("leads")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("company_id", scopedCompanyId);

  const { error } = await query;

  return { error };
}

export async function updateLeadFollowUpRecord(supabaseClient, leadId, followUpInput, companyId = null) {
  const scopedCompanyId = requireCompanyId(companyId, "Обновление следующего контакта");
  const followUpAt = followUpInput ? new Date(followUpInput).toISOString() : null;
  const query = supabaseClient
    .from("leads")
    .update({
      follow_up_at: followUpAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", leadId)
    .eq("company_id", scopedCompanyId);

  const { error } = await query;

  return { error, followUpAt };
}

export async function addLeadNoteRecord(supabaseClient, leadId, note, createdBy, companyId = null) {
  const scopedCompanyId = requireCompanyId(companyId, "Добавление заметки");
  return createLeadEvent(supabaseClient, {
    lead_id: leadId,
    company_id: scopedCompanyId,
    type: "note_added",
    note,
    payload: {},
    created_by: createdBy
  });
}

const CLIENT_ATTACHMENT_BUCKET = "client-lead-attachments";
const SIGNED_ATTACHMENT_TTL_SECONDS = 60 * 60 * 24 * 365;

function sanitizeFileName(fileName) {
  return (fileName || "photo")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function uploadLeadAttachmentFile(supabaseClient, leadId, file, isCustomerVisible = true, photoStage = "after", companyId = null) {
  const scopedCompanyId = requireCompanyId(companyId, "Загрузка фото");
  if (!file) {
    throw new Error("Файл не выбран.");
  }

  const fileName = sanitizeFileName(file.name);
  const objectPath = `${leadId}/${crypto.randomUUID()}-${fileName || "photo"}`;
  const pendingFileUrl = `pending:${objectPath}`;

  const draftPayload = {
    lead_id: leadId,
    company_id: scopedCompanyId,
    file_url: pendingFileUrl,
    file_type: file.type || "image/jpeg",
    storage_bucket: CLIENT_ATTACHMENT_BUCKET,
    storage_object_path: objectPath,
    photo_stage: photoStage === "before" ? "before" : "after",
    is_customer_visible: Boolean(isCustomerVisible)
  };

  const { data: createdAttachment, error: createAttachmentError } = await supabaseClient
    .from("attachments")
    .insert(draftPayload)
    .select("*")
    .maybeSingle();

  if (createAttachmentError) {
    throw createAttachmentError;
  }

  const { error: uploadError } = await supabaseClient.storage.from(CLIENT_ATTACHMENT_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false
  });

  if (uploadError) {
    if (createdAttachment?.id) {
      await supabaseClient.from("attachments").delete().eq("id", createdAttachment.id).eq("company_id", scopedCompanyId);
    }
    throw uploadError;
  }

  const { data: signedData, error: signedError } = await supabaseClient.storage
    .from(CLIENT_ATTACHMENT_BUCKET)
    .createSignedUrl(objectPath, SIGNED_ATTACHMENT_TTL_SECONDS);

  if (signedError) {
    if (createdAttachment?.id) {
      await supabaseClient.storage.from(CLIENT_ATTACHMENT_BUCKET).remove([objectPath]);
      await supabaseClient.from("attachments").delete().eq("id", createdAttachment.id).eq("company_id", scopedCompanyId);
    }
    throw signedError;
  }

  if (!signedData?.signedUrl) {
    if (createdAttachment?.id) {
      await supabaseClient.storage.from(CLIENT_ATTACHMENT_BUCKET).remove([objectPath]);
      await supabaseClient.from("attachments").delete().eq("id", createdAttachment.id).eq("company_id", scopedCompanyId);
    }
    throw new Error("Не удалось получить ссылку на фото.");
  }

  const payload = {
    file_url: signedData.signedUrl,
    file_type: file.type || "image/jpeg"
  };

  const { data, error } = await supabaseClient
    .from("attachments")
    .update(payload)
    .eq("id", createdAttachment?.id)
    .eq("company_id", scopedCompanyId)
    .select("*")
    .maybeSingle();

  if (error) {
    await supabaseClient.storage.from(CLIENT_ATTACHMENT_BUCKET).remove([objectPath]);
    if (createdAttachment?.id) {
      await supabaseClient.from("attachments").delete().eq("id", createdAttachment.id).eq("company_id", scopedCompanyId);
    }
    throw error;
  }

  return data;
}

export async function submitPublicReview(supabaseClient, token, rating, comment) {
  const cleanToken = String(token || "").trim();

  if (!cleanToken) {
    throw new Error("Ссылка статуса неполная.");
  }

  const { data, error } = await supabaseClient.rpc("submit_public_review", {
    p_token: cleanToken,
    p_rating: Number(rating),
    p_comment: String(comment || "").trim()
  });

  if (error) {
    throw error;
  }

  return data;
}
