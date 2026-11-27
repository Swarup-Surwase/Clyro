/**
 * Completely synthetic Indian disaster relief coordination dataset.
 * Uses RFC 2606 example domains, RFC 5737 / RFC 3849 reserved documentation IPs,
 * public payment test card numbers, and clearly fictitious format-shaped IDs.
 * Contains zero real victim records or live credentials.
 */

export const SYNTHETIC_RELIEF_CSV = [
  'case_ref,district,family_size,assistance,urgency,shelter_status,contact_email,phone,ip,pan,aadhaar,card,notes',
  'DEMO-001,Pune,5,"Food, clean water, and tarpaulin",High,Needs temporary camp,ravi@example.com,+91 98765 43210,192.0.2.10,ABCDE1234F,2345 6789 0123,4111 1111 1111 1111,"Synthetic fixture: primary family intake"',
  'DEMO-002,Nashik,3,Drinking water and ORS,Medium,Staying with relatives,ravi@example.com,9876543210,2001:db8::1,abcde1234f,234567890123,4111111111111111,"Repeat identity format test across rows"',
  'DEMO-003,Satara,2,Medical referral,High,Hospital transit,team@example.org,+91-98201-11223,999.1.2.3,PQRSX5678K,3456-7890-1234,4111111111111112,"Invalid IP (999.1.2.3) & invalid Luhn card (ends 1112)"',
  'DEMO-004,Kolhapur,6,"Dry rations, blankets",Low,Community hall,coordinator@example.net,09123456789,2001:0db8:0000:0000:0000:0000:0000:0001,LMNOP9012Q,,1234567890123456,"Expanded IPv6 equivalent + invalid 16-digit card"',
  'DEMO-005,Raigad,4,"Emergency shelter kit",High,Evacuation center,relief.desk@example.org.,9820111223,198.51.100.42,ABCDE1234F,4567 8901 2345,0000 0000 0000 0000,"Trailing dot on email; all-zero card rejected;\nmultiline note with Marathi text: पुणे मदत"',
].join('\n') + '\n';

export const SYNTHETIC_RELIEF_TXT = [
  'CLYRO SYNTHETIC RELIEF INTAKE LOG (FICTIONAL TEST FIXTURE)',
  'District: Pune | Family Size: 5 | Assistance: Food and shelter | Urgency: High',
  'Coordinator Contact: ravi@example.com, alt: (Ravi@EXAMPLE.COM).',
  'Mobile: +91 98765 43210 (duplicate format: 9876543210)',
  'Network Origin: 192.0.2.10 | Backup IPv6: 2001:db8::1 (expanded: 2001:0DB8:0000:0000:0000:0000:0000:0001)',
  'ID Format Fixtures: PAN ABCDE1234F (lowercase abcde1234f) | Aadhaar 2345 6789 0123',
  'Test Card (Luhn valid): 4111 1111 1111 1111 | Rejected Luhn Card: 4111 1111 1111 1112',
  'Invalid IP rejected: 999.1.2.3 | Rejected random 16-digit: 1234567890123456',
].join('\n');

export const LANDING_DEMO_CSV = [
  'case_ref,district,family_size,assistance,contact_email,phone,ip,pan,aadhaar,card',
  'DEMO-001,Pune,5,Food and shelter,ravi@example.com,+91 98765 43210,192.0.2.10,ABCDE1234F,2345 6789 0123,4111 1111 1111 1111',
  'DEMO-002,Nashik,3,Drinking water,ravi@example.com,9876543210,2001:db8::1,abcde1234f,234567890123,4111111111111111',
  'DEMO-003,Satara,2,Medical referral,team@example.org,+91-98201-11223,999.1.2.3,,,4111111111111112',
].join('\n');
