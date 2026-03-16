insert into public.workspaces (id, name, slug, industry)
values ('11111111-1111-1111-1111-111111111111', 'Northstar Support', 'northstar-support', 'B2B SaaS')
on conflict (id) do nothing;

insert into public.workspace_secrets (workspace_id, provider, base_url, chat_model, embedding_model)
values (
  '11111111-1111-1111-1111-111111111111',
  'mock',
  'http://127.0.0.1:11434/v1',
  'llama3.1',
  'nomic-embed-text'
)
on conflict (workspace_id) do nothing;

insert into public.documents (id, workspace_id, title, format, summary, status, storage_path, extracted_text, chunk_count)
values
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'Billing and refunds handbook',
    'md',
    'Explains refund windows and how support should handle duplicate billing.',
    'indexed',
    'playbooks/billing-refunds.md',
    'Customers on monthly plans can request a refund within 14 days of the first successful charge.',
    1
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'SSO troubleshooting guide',
    'md',
    'Covers SAML mismatches and escalation rules.',
    'indexed',
    'runbooks/sso-guide.md',
    'Three or more SSO failures within 30 minutes should be escalated to the platform on-call engineer.',
    1
  )
on conflict (id) do nothing;

insert into public.document_chunks (workspace_id, document_id, title, content, token_count)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    'Billing and refunds handbook',
    'Customers on monthly plans can request a refund within 14 days of the first successful charge.',
    20
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'SSO troubleshooting guide',
    'Three or more SSO failures within 30 minutes should be escalated to the platform on-call engineer.',
    20
  );

insert into public.tickets (id, workspace_id, ticket_number, subject, summary, body, status, priority, requester, assignee, tags)
values
  (
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111',
    101,
    'Duplicate annual invoice after plan upgrade',
    'Customer was billed twice after moving from monthly to annual.',
    'Finance wants a refund and an explanation of whether access will be interrupted.',
    'open',
    'high',
    'ava@juniperlabs.io',
    'Mina Patel',
    array['billing', 'refund']
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111',
    102,
    'SSO users locked out after IdP certificate rotation',
    'Multiple enterprise users cannot sign in after an identity provider change.',
    'Northfield rotated an Okta certificate and now receives a SAML audience mismatch error.',
    'pending',
    'urgent',
    'sre@northfield.co',
    'Leo Chen',
    array['sso', 'incident']
  )
on conflict (id) do nothing;

insert into public.eval_cases (id, workspace_id, title, prompt, expected, requires_citation)
values
  (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    'Refund policy lookup',
    'Can we refund a first monthly charge after 10 days?',
    '["14 days", "first successful charge"]'::jsonb,
    true
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '11111111-1111-1111-1111-111111111111',
    'SSO escalation rule',
    'When should an SSO failure cluster be escalated?',
    '["three", "30 minutes", "on-call"]'::jsonb,
    true
  )
on conflict (id) do nothing;
