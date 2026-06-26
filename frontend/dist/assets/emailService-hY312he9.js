import{s as S}from"./index-CNUw055C.js";const A=async({to:t,subject:e,html:r,from:n})=>{try{console.log(`[Resend Client] Dispatching email to: ${t} via backend proxy...`);const i=await fetch("/api/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:t,subject:e,html:r,from:n})});if(i.ok)return{success:!0,id:(await i.json()).id||"msg_"+Math.random().toString(36).substr(2,9)};const m=await i.text();console.warn(`[Resend Client] Backend endpoint failed (${i.status}): ${m}. Falling back...`)}catch(o){console.warn(`[Resend Client] Backend proxy unreachable: ${o.message}. Falling back...`)}const l="re_4aKppTUo_CJJ3a2FR74NuRQSh7XmTgy9c";try{console.log("[Resend Client] Direct dispatch attempt via client key...");const o=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${l}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Sparkles Apartments <onboarding@resend.dev>",to:[t],subject:e,html:r})});if(o.ok)return{success:!0,id:(await o.json()).id};const i=await o.json();console.error("[Resend Client] Direct Resend API failed:",i)}catch(o){console.error("[Resend Client] Direct Resend API error:",o)}return console.warn(`[Resend Client] Simulating email delivery to: ${t}`),await new Promise(o=>setTimeout(o,800)),{success:!0,simulated:!0}},V=async(t,e)=>{if(!e)return console.warn(`[Automation Engine] Trigger aborted for ${t}: Missing payload.`),{success:!1,reason:"Missing booking payload"};try{console.log(`[Automation Engine] Triggered event: "${t}"`);const{data:r}=await S.from("system_settings").select("setting_key, setting_value").in("setting_key",["notification_engine_active","contact_logo","contact_address","contact_phone","contact_email","system_theme"]),n=r?.reduce((p,a)=>(p[a.setting_key]=a.setting_value,p),{})||{};if(!(n.notification_engine_active==="true"||n.notification_engine_active===!0||n.notification_engine_active===void 0))return console.log("[Automation Engine] Engine is toggled offline in System Control."),{success:!1,reason:"Notification engine inactive"};const o=n.system_theme||"theme-luxe-gold",m={"theme-slate-dark":"#64748B","theme-luxe-gold":"#DF6853","theme-emerald-green":"#10B981","theme-royal-blue":"#3B82F6","theme-sunset-orange":"#F97316","theme-rose-burgundy":"#F43F5E","theme-midnight-purple":"#A855F7","theme-ocean-teal":"#14B8A6"}[o]||"#DF6853";let d=n.contact_logo||"https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";d&&d.startsWith("/")&&(d=window.location.origin+d);const T=n.contact_address||"Plot 572 Iduwa Ogenyi Street Mabushi, Off Ahmadu Bello Way, Abuja",M=n.contact_phone||"08033214684, 08062332639, 08171278657",R=n.contact_email||"info@sparklesapartments.ng",{data:g,error:y}=await S.from("automation_rules").select("*, notification_templates(*)").eq("trigger_event",t).eq("is_active",!0);if(y)return console.error("[Automation Engine] Failed to fetch active rules:",y),{success:!1,error:y.message};if(!g||g.length===0)return console.log(`[Automation Engine] Zero active rules configured for event "${t}".`),{success:!0,count:0};console.log(`[Automation Engine] Processing ${g.length} automations for "${t}"...`);const v=[];for(const p of g){const a=p.notification_templates;if(!a)continue;const f=e.profiles||{},$=e.guest_name||`${f.first_name||""} ${f.last_name||""}`.trim()||"Valued Guest",F=e.guest_email||e.email||f.email||"guest@example.com",z=e.guest_phone||e.phone||f.phone||"N/A",E=e.booking_reference||e.id||"BKG-MOCK",B=e.check_in_date||e.check_in||"N/A",L=e.check_out_date||e.check_out||"N/A",c=a.channel==="email"?F:z;if(!c||c==="N/A"){console.warn(`[Automation Engine] Skipping rule "${p.name}": No recipient detail.`);continue}const O=e.room_number||e.rooms&&e.rooms.room_number||"N/A",j=e.room_details||e.rooms&&e.rooms.name||"Premium Suite",P=e.total_amount||e.total_amount_ngn||e.total_price||"0.00",N=e.total_paid||e.amount_paid||e.amount_paid_ngn||"0.00",I=e.balance_due!==void 0?e.balance_due:(Number(P)-Number(N)).toFixed(2),G=e.payment_status||"Pending",K=e.payment_amount||e.amount||"0.00",W=e.payment_ref||e.payment_reference||"N/A",J=e.payment_method||"N/A",U=e.payment_date||new Date().toLocaleDateString(),Y=e.invoice_number||"INV-"+E,k=s=>s?s.replace(/{{guest_name}}/g,$).replace(/{{booking_ref}}/g,E).replace(/{{check_in}}/g,B).replace(/{{check_out}}/g,L).replace(/{{room_number}}/g,O).replace(/{{room_details}}/g,j).replace(/{{total_amount}}/g,Number(P).toLocaleString()).replace(/{{total_paid}}/g,Number(N).toLocaleString()).replace(/{{balance_due}}/g,Number(I).toLocaleString()).replace(/{{payment_status}}/g,G).replace(/{{payment_amount}}/g,Number(K).toLocaleString()).replace(/{{payment_ref}}/g,W).replace(/{{payment_method}}/g,J.toUpperCase()).replace(/{{payment_date}}/g,U).replace(/{{invoice_number}}/g,Y):"",C=k(a.subject||"Sparkles Apartments Update"),x=k(a.body||"");let u="failed",b=null,h=!1;if(a.channel==="email"){const s=`
          <div style="font-family: 'Outfit', sans-serif; padding: 30px; color: #1f2937; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-top: 6px solid ${m}; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 20px;">
              ${d?`<img src="${d}" alt="Sparkles Apartments" style="max-height: 50px; object-fit: contain; margin-bottom: 8px; border-radius: 4px;" />`:""}
              <h2 style="color: #000000; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.05em;">SPARKLES APARTMENTS</h2>
              <span style="font-size: 11px; color: ${m}; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Premium Luxury Shortlets</span>
            </div>
            <div style="font-size: 15px; line-height: 1.6; color: #4b5563;">
              ${x.replace(/\n/g,"<br/>")}
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
              <p style="margin: 0 0 5px 0;">This is an automated operational alert sent from the Sparkles PMS Hub.</p>
              <p style="margin: 0;">${T}</p>
              <p style="margin: 5px 0 0 0;">Phones: ${M} | Email: ${R}</p>
            </div>
          </div>
        `,_=await A({to:c,subject:C,from:"booking@sparklesapartments.ng",html:s});if(_.success?(u="sent",h=!!_.simulated):b=_.error||"SMTP routing failure",c!=="booking@sparklesapartments.ng")try{console.log("[Automation Engine] Forwarding admin copy of booking update to booking@sparklesapartments.ng...");const w=`
              <div style="background-color: #f3f4f6; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px; font-family: sans-serif; font-size: 13px; color: #4b5563; line-height: 1.5;">
                <strong>[PMS Admin Notification]</strong><br/>
                Recipient: <strong>${$}</strong> (${c})<br/>
                Trigger Event: <strong>${t}</strong>
              </div>
              ${s}
            `;await A({to:"booking@sparklesapartments.ng",subject:`[ADMIN] ${C}`,from:"booking@sparklesapartments.ng",html:w})}catch(w){console.warn("[Automation Engine] Failed to dispatch admin copy:",w)}}else if(a.channel==="sms"){const s=await q({to:c,message:x});s.success?(u="sent",h=!!s.simulated):b=s.error||"SMS Gateway routing failure"}else console.log(`[Automation Engine] Simulating "${a.channel}" dispatch to ${c}:
${x}`),await new Promise(s=>setTimeout(s,400)),u="sent",h=!0;try{const{error:s}=await S.from("notification_logs").insert([{recipient:c,channel:a.channel,template_name:a.name,status:u,error_message:b,sent_at:new Date().toISOString()}]);s&&console.error("[Automation Engine] Log insertion error:",s)}catch(s){console.error("[Automation Engine] Log commit exception:",s)}v.push({ruleName:p.name,channel:a.channel,status:u,simulated:h})}return{success:!0,executions:v}}catch(r){return console.error("[Automation Engine] Core trigger execution crash:",r),{success:!1,error:r.message}}},q=async({to:t,message:e})=>{try{console.log(`[SMS Client] Dispatching SMS to: ${t} via backend proxy...`);const n=await fetch("/api/sms/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:t,message:e})});if(n.ok){const o=await n.json();return{success:!0,id:o.messageId,simulated:!!o.simulated}}const l=await n.text();return console.warn(`[SMS Client] Backend SMS proxy failed: ${l}`),{success:!1,error:l}}catch(r){return console.error(`[SMS Client] Backend SMS proxy unreachable: ${r.message}`),{success:!1,error:r.message}}},Q=async({email:t,firstName:e,lastName:r,password:n=null})=>{const l=`${window.location.origin}/login`,o=n?"Your Sparkles Apartments Credentials & Account Details":"Welcome to Sparkles Apartments - Premium Luxury Shortlets",i=`
    <div style="font-family: 'Outfit', sans-serif; padding: 40px; color: #1f2937; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-top: 8px solid #DF6853; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 25px; margin-bottom: 25px;">
        <h2 style="color: #000000; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.05em;">SPARKLES APARTMENTS</h2>
        <span style="font-size: 11px; color: #DF6853; text-transform: uppercase; letter-spacing: 0.15em; font-weight: bold;">Premium Luxury Shortlets</span>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111827; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 15px; border-left: 4px solid #DF6853; padding-left: 10px;">Welcome to Sparkles Apartments!</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0;">
          Dear <strong>${e} ${r}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-top: 10px;">
          Thank you for registering with Sparkles Apartments. Your account has been successfully created. You can now log in to the Guest Portal to view and manage your bookings, request room upgrades, make laundry and dining orders, and view your prepayment wallet.
        </p>
      </div>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
        <h4 style="color: #374151; font-size: 13px; font-weight: 700; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #4b5563;">
          <tr>
            <td style="padding: 6px 0; font-weight: bold; width: 35%;">Guest Portal URL:</td>
            <td style="padding: 6px 0; color: #111827;"><a href="${l}" style="color: #DF6853; font-weight: bold; text-decoration: none;">Click Here to Login</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Email Address:</td>
            <td style="padding: 6px 0; color: #111827; font-weight: bold;">${t}</td>
          </tr>
          \${password ? \`
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #b45309;">Password:</td>
            <td style="padding: 6px 0; color: #b45309; font-family: monospace; font-size: 14px; font-weight: bold;">\${password}</td>
          </tr>
          \` : \`
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Password:</td>
            <td style="padding: 6px 0; color: #111827; font-style: italic;">The password you selected during registration</td>
          </tr>
          \`}
        </table>
        \${password ? \`
        <div style="margin-top: 15px; font-size: 11px; color: #b45309; background-color: #fffbeb; padding: 10px; border: 1px solid #fef3c7; border-radius: 6px;">
          ⚠️ For security reasons, please log in and change your password immediately in the settings tab.
        </div>
        \` : ''}
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${l}" style="background-color: #DF6853; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Access Guest Portal</a>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
        <p style="margin: 0 0 5px 0;">This is an official automated onboarding notification from Sparkles Apartments.</p>
        <p style="margin: 0;">Plot 572 Iduwa Ogenyi Street Mabushi, Off Ahmadu Bello Way, Abuja</p>
      </div>
    </div>
  `;return await A({to:t,subject:o,html:i,from:"welcome@sparklesapartments.ng"})};export{A as a,q as b,Q as s,V as t};
