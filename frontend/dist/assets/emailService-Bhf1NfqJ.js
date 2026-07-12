import{s as w}from"./index-BdCy-Lij.js";const q=t=>{if(!t)return null;let e=t.replace(/\D/g,"");return e.length<10||(e.startsWith("0")&&e.length===11&&(e="234"+e.slice(1)),e.length<11||e.length>15)?null:e},H=async(t,e)=>{try{const o=q(t);if(!o)return null;const l=await fetch("/api/sms/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:o,message:e})}),n=await l.json();return{success:l.ok,message_id:n.messageId,error:n.error,result:n}}catch(o){return console.error("Termii SMS Proxy Error:",o),{success:!1,error:o.message}}},A=async({to:t,subject:e,html:o,from:s})=>{try{console.log(`[Resend Client] Dispatching email to: ${t} via backend proxy...`);const a=await fetch("/api/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:t,subject:e,html:o,from:s})});if(a.ok)return{success:!0,id:(await a.json()).id||"msg_"+Math.random().toString(36).substr(2,9)};const p=await a.text();console.warn(`[Resend Client] Backend endpoint failed (${a.status}): ${p}. Falling back...`)}catch(n){console.warn(`[Resend Client] Backend proxy unreachable: ${n.message}. Falling back...`)}const l="re_4aKppTUo_CJJ3a2FR74NuRQSh7XmTgy9c";try{console.log("[Resend Client] Direct dispatch attempt via client key...");const n=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${l}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Sparkles Apartments <onboarding@resend.dev>",to:[t],subject:e,html:o})});if(n.ok)return{success:!0,id:(await n.json()).id};const a=await n.json();console.error("[Resend Client] Direct Resend API failed:",a)}catch(n){console.error("[Resend Client] Direct Resend API error:",n)}return console.warn(`[Resend Client] Simulating email delivery to: ${t}`),await new Promise(n=>setTimeout(n,800)),{success:!0,simulated:!0}},X=async(t,e)=>{if(!e)return console.warn(`[Automation Engine] Trigger aborted for ${t}: Missing payload.`),{success:!1,reason:"Missing booking payload"};try{console.log(`[Automation Engine] Triggered event: "${t}"`);const{data:o}=await w.from("system_settings").select("setting_key, setting_value").in("setting_key",["notification_engine_active","contact_logo","contact_address","contact_phone","contact_email","system_theme"]),s=o?.reduce((m,i)=>(m[i.setting_key]=i.setting_value,m),{})||{};if(!(s.notification_engine_active==="true"||s.notification_engine_active===!0||s.notification_engine_active===void 0))return console.log("[Automation Engine] Engine is toggled offline in System Control."),{success:!1,reason:"Notification engine inactive"};const n=s.system_theme||"theme-luxe-gold",p={"theme-slate-dark":"#64748B","theme-luxe-gold":"#DF6853","theme-emerald-green":"#10B981","theme-royal-blue":"#3B82F6","theme-sunset-orange":"#F97316","theme-rose-burgundy":"#F43F5E","theme-midnight-purple":"#A855F7","theme-ocean-teal":"#14B8A6"}[n]||"#DF6853";let d=s.contact_logo||"https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";d&&d.startsWith("/")&&(d=window.location.origin+d);const k=s.contact_address||"Plot 572 Iduwa Ogenyi Street Mabushi, Off Ahmadu Bello Way, Abuja",M=s.contact_phone||"08033214684, 08062332639, 08171278657",R=s.contact_email||"info@sparklesapartments.ng",{data:g,error:y}=await w.from("automation_rules").select("*, notification_templates(*)").eq("trigger_event",t).eq("is_active",!0);if(y)return console.error("[Automation Engine] Failed to fetch active rules:",y),{success:!1,error:y.message};if(!g||g.length===0)return console.log(`[Automation Engine] Zero active rules configured for event "${t}".`),{success:!0,count:0};console.log(`[Automation Engine] Processing ${g.length} automations for "${t}"...`);const v=[];for(const m of g){const i=m.notification_templates;if(!i)continue;const f=e.profiles||{},$=e.guest_name||`${f.first_name||""} ${f.last_name||""}`.trim()||"Valued Guest",F=e.guest_email||e.email||f.email||"guest@example.com",z=e.guest_phone||e.phone||f.phone||"N/A",P=e.booking_reference||e.id||"BKG-MOCK",L=e.check_in_date||e.check_in||"N/A",B=e.check_out_date||e.check_out||"N/A",c=i.channel==="email"?F:z;if(!c||c==="N/A"){console.warn(`[Automation Engine] Skipping rule "${m.name}": No recipient detail.`);continue}const O=e.room_number||e.rooms&&e.rooms.room_number||"N/A",j=e.room_details||e.rooms&&e.rooms.name||"Premium Suite",E=e.total_amount||e.total_amount_ngn||e.total_price||"0.00",N=e.total_paid||e.amount_paid||e.amount_paid_ngn||"0.00",I=e.balance_due!==void 0?e.balance_due:(Number(E)-Number(N)).toFixed(2),W=e.payment_status||"Pending",G=e.payment_amount||e.amount||"0.00",K=e.payment_ref||e.payment_reference||"N/A",J=e.payment_method||"N/A",U=e.payment_date||new Date().toLocaleDateString(),Y=e.invoice_number||"INV-"+P,T=r=>r?r.replace(/{{guest_name}}/g,$).replace(/{{booking_ref}}/g,P).replace(/{{check_in}}/g,L).replace(/{{check_out}}/g,B).replace(/{{room_number}}/g,O).replace(/{{room_details}}/g,j).replace(/{{total_amount}}/g,Number(E).toLocaleString()).replace(/{{total_paid}}/g,Number(N).toLocaleString()).replace(/{{balance_due}}/g,Number(I).toLocaleString()).replace(/{{payment_status}}/g,W).replace(/{{payment_amount}}/g,Number(G).toLocaleString()).replace(/{{payment_ref}}/g,K).replace(/{{payment_method}}/g,J.toUpperCase()).replace(/{{payment_date}}/g,U).replace(/{{invoice_number}}/g,Y):"",C=T(i.subject||"Sparkles Apartments Update"),x=T(i.body||"");let u="failed",b=null,h=!1;if(i.channel==="email"){const r=`
          <div style="font-family: 'Outfit', sans-serif; padding: 30px; color: #1f2937; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-top: 6px solid ${p}; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 20px;">
              ${d?`<img src="${d}" alt="Sparkles Apartments" style="max-height: 50px; object-fit: contain; margin-bottom: 8px; border-radius: 4px;" />`:""}
              <h2 style="color: #000000; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.05em;">SPARKLES APARTMENTS</h2>
              <span style="font-size: 11px; color: ${p}; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Premium Luxury Shortlets</span>
            </div>
            <div style="font-size: 15px; line-height: 1.6; color: #4b5563;">
              ${x.replace(/\n/g,"<br/>")}
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
              <p style="margin: 0 0 5px 0;">This is an automated operational alert sent from the Sparkles PMS Hub.</p>
              <p style="margin: 0;">${k}</p>
              <p style="margin: 5px 0 0 0;">Phones: ${M} | Email: ${R}</p>
            </div>
          </div>
        `,_=await A({to:c,subject:C,from:"booking@sparklesapartments.ng",html:r});if(_.success?(u="sent",h=!!_.simulated):b=_.error||"SMTP routing failure",c!=="booking@sparklesapartments.ng")try{console.log("[Automation Engine] Forwarding admin copy of booking update to booking@sparklesapartments.ng...");const S=`
              <div style="background-color: #f3f4f6; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px; font-family: sans-serif; font-size: 13px; color: #4b5563; line-height: 1.5;">
                <strong>[PMS Admin Notification]</strong><br/>
                Recipient: <strong>${$}</strong> (${c})<br/>
                Trigger Event: <strong>${t}</strong>
              </div>
              ${r}
            `;await A({to:"booking@sparklesapartments.ng",subject:`[ADMIN] ${C}`,from:"booking@sparklesapartments.ng",html:S})}catch(S){console.warn("[Automation Engine] Failed to dispatch admin copy:",S)}}else if(i.channel==="sms"){const r=await V({to:c,message:x});r.success?(u="sent",h=!!r.simulated):b=r.error||"SMS Gateway routing failure"}else console.log(`[Automation Engine] Simulating "${i.channel}" dispatch to ${c}:
${x}`),await new Promise(r=>setTimeout(r,400)),u="sent",h=!0;try{const{error:r}=await w.from("notification_logs").insert([{recipient:c,channel:i.channel,template_name:i.name,status:u,error_message:b,sent_at:new Date().toISOString()}]);r&&console.error("[Automation Engine] Log insertion error:",r)}catch(r){console.error("[Automation Engine] Log commit exception:",r)}v.push({ruleName:m.name,channel:i.channel,status:u,simulated:h})}return{success:!0,executions:v}}catch(o){return console.error("[Automation Engine] Core trigger execution crash:",o),{success:!1,error:o.message}}},V=async({to:t,message:e})=>{try{console.log(`[SMS Client] Dispatching Termii SMS to: ${t}`);const o=await H(t,e);return o&&o.message_id?{success:!0,id:o.message_id}:(console.warn("[SMS Client] Termii SMS failed"),{success:!1,error:"Termii SMS dispatch failed"})}catch(o){return console.error(`[SMS Client] Termii SMS error: ${o.message}`),{success:!1,error:o.message}}},Z=async({email:t,firstName:e,lastName:o,password:s=null})=>{const l=`${window.location.origin}/login`,n=s?"Your Sparkles Apartments Credentials & Account Details":"Welcome to Sparkles Apartments - Premium Luxury Shortlets",a=`
    <div style="font-family: 'Outfit', sans-serif; padding: 40px; color: #1f2937; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-top: 8px solid #DF6853; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 25px; margin-bottom: 25px;">
        <h2 style="color: #000000; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.05em;">SPARKLES APARTMENTS</h2>
        <span style="font-size: 11px; color: #DF6853; text-transform: uppercase; letter-spacing: 0.15em; font-weight: bold;">Premium Luxury Shortlets</span>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #111827; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 15px; border-left: 4px solid #DF6853; padding-left: 10px;">Welcome to Sparkles Apartments!</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0;">
          Dear <strong>${e} ${o}</strong>,
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
  `;return await A({to:t,subject:n,html:a,from:"welcome@sparklesapartments.ng"})};export{H as a,A as b,V as c,Z as s,X as t};
