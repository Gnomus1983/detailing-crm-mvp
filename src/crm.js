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

export async function createOrReuseClient(supabaseClient, form) {
  const phone = form.phone.trim();
  const {
    data: existingClient,
    error: existingClientError
  } = await supabaseClient.from("clients").select("*").eq("phone", phone).maybeSingle();

  if (existingClientError) {
    throw existingClientError;
  }

  const clientPayload = {
    name: form.client_name.trim(),
    phone,
    email: form.email.trim() || null,
    car_make: form.car_make.trim() || null,
    car_model: form.car_model.trim() || null,
    car_year: form.car_year ? Number(form.car_year) : null,
    car_plate: form.car_plate.trim() || null,
    notes: form.comment.trim() || existingClient?.notes || null
  };

  const { data, error } = await supabaseClient
    .from("clients")
    .upsert(clientPayload, {
      onConflict: "phone"
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { client: data, reused: Boolean(existingClient) };
}

export async function createLeadRecord(supabaseClient, clientId, form) {
  const leadInsert = {
    client_id: clientId,
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
      website: form.website || ""
    }
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.result;
}

export async function updateLeadStatusRecord(supabaseClient, leadId, nextStatus) {
  const { error } = await supabaseClient
    .from("leads")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  return { error };
}

export async function updateLeadFollowUpRecord(supabaseClient, leadId, followUpInput) {
  const followUpAt = followUpInput ? new Date(followUpInput).toISOString() : null;
  const { error } = await supabaseClient
    .from("leads")
    .update({
      follow_up_at: followUpAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", leadId);

  return { error, followUpAt };
}

export async function addLeadNoteRecord(supabaseClient, leadId, note, createdBy) {
  return createLeadEvent(supabaseClient, {
    lead_id: leadId,
    type: "note_added",
    note,
    payload: {},
    created_by: createdBy
  });
}
