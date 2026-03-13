import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      to,
      orderId,
      companyName,
      ruc,
      amount,
      items = [],
      subtotal = 0,
      tax = 0,
      shipping = 0,
      customerEmail,
      customerName
    } = body;

    // Validar datos requeridos
    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Email destino es requerido' },
        { status: 400 }
      );
    }

    // Si no hay variables de entorno configuradas, usar un fallback
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    };

    // Crear transporter
    const transporter = nodemailer.createTransport(smtpConfig);

    // Verificar conexión SMTP
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (smtpError) {
      console.error('❌ SMTP verification failed:', smtpError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error de configuración SMTP',
          details: 'Revisa tus variables de entorno'
        },
        { status: 500 }
      );
    }

    // Crear tabla HTML de productos
    const productsTable = items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.nombre || 'Producto'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.cantidad}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">S/ ${(item.precioBase || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">S/ ${((item.precioBase || 0) * item.cantidad).toFixed(2)}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"B2B Commerce Pro" <${process.env.SMTP_USER || 'noreply@b2bcommerce.com'}>`,
      to: to,
      bcc: process.env.SMTP_USER, // Copia al administrador
      subject: `Factura Electrónica - Orden #${orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Factura Electrónica</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e40af, #0d9488); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .company-info { margin-top: 20px; }
              .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .details-table th { background: #f1f1f1; padding: 12px; text-align: left; }
              .details-table td { padding: 12px; border-bottom: 1px solid #ddd; }
              .total-section { background: #e8f4fd; padding: 20px; border-radius: 8px; margin-top: 30px; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #1e40af; font-size: 12px; color: #666; }
              .badge { display: inline-block; padding: 5px 10px; background: #10b981; color: white; border-radius: 4px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="invoice-title">FACTURA ELECTRÓNICA</div>
                <div style="font-size: 14px; opacity: 0.9;">B2B Commerce Pro - Plataforma Empresarial</div>
                <div style="margin-top: 15px; font-size: 16px;">
                  <strong>Orden:</strong> ${orderId}<br>
                  <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-PE')}
                </div>
              </div>
              
              <div class="content">
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                  <div>
                    <h3 style="margin: 0 0 10px 0; color: #1e40af;">INFORMACIÓN DE LA EMPRESA</h3>
                    <p style="margin: 5px 0;"><strong>Razón Social:</strong> ${companyName}</p>
                    <p style="margin: 5px 0;"><strong>RUC:</strong> ${ruc}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${customerEmail}</p>
                    <p style="margin: 5px 0;"><strong>Contacto:</strong> ${customerName}</p>
                  </div>
                  <div style="text-align: right;">
                    <span class="badge">FACTURABLE</span>
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">
                      <div>Estado: <strong style="color: #10b981;">Pagado</strong></div>
                      <div>Método: <strong>Tarjeta de Crédito</strong></div>
                      <div>Plazo: <strong>30 días neto</strong></div>
                    </div>
                  </div>
                </div>

                <h3 style="color: #1e40af; margin-bottom: 15px;">DETALLE DE PRODUCTOS</h3>
                <table class="details-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style="text-align: center;">Cantidad</th>
                      <th style="text-align: right;">Precio Unitario</th>
                      <th style="text-align: right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productsTable || '<tr><td colspan="4" style="text-align: center;">No hay productos</td></tr>'}
                  </tbody>
                </table>

                <div class="total-section">
                  <div style="display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 10px;">
                    <span>Subtotal:</span>
                    <span><strong>S/ ${subtotal.toFixed(2)}</strong></span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 10px;">
                    <span>IGV (18%):</span>
                    <span><strong>S/ ${tax.toFixed(2)}</strong></span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 10px;">
                    <span>Envío:</span>
                    <span><strong>S/ ${shipping.toFixed(2)}</strong></span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 20px; margin-top: 15px; padding-top: 15px; border-top: 2px solid #1e40af;">
                    <span><strong>TOTAL A PAGAR:</strong></span>
                    <span style="color: #1e40af;"><strong>S/ ${amount.toFixed(2)}</strong></span>
                  </div>
                </div>

                <div class="footer">
                  <p><strong>Información Importante:</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Esta factura es válida como comprobante de pago ante SUNAT</li>
                    <li>La factura electrónica será enviada al correo registrado en SUNAT</li>
                    <li>Para cualquier consulta, contactar a: facturacion@b2bcommerce.com</li>
                    <li>Teléfono: +51 1 640-9000</li>
                  </ul>
                  <p style="margin-top: 20px; text-align: center;">
                    © ${new Date().getFullYear()} B2B Commerce Pro - RUC: 20605467891
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Factura Electrónica - Orden #${orderId}
      
Para: ${companyName}
RUC: ${ruc}
Contacto: ${customerName}
Email: ${customerEmail}

Detalle de productos:
${items.map((item: any) => 
  `- ${item.nombre || 'Producto'}: ${item.cantidad} x S/ ${(item.precioBase || 0).toFixed(2)} = S/ ${((item.precioBase || 0) * item.cantidad).toFixed(2)}`
).join('\n')}

Resumen:
Subtotal: S/ ${subtotal.toFixed(2)}
IGV (18%): S/ ${tax.toFixed(2)}
Envío: S/ ${shipping.toFixed(2)}
TOTAL: S/ ${amount.toFixed(2)}

Esta factura es válida como comprobante de pago.
Para consultas: facturacion@b2bcommerce.com
`,
    };

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Correo enviado:', {
      to: mailOptions.to,
      messageId: info.messageId,
      orderId: orderId
    });

    return NextResponse.json({
      success: true,
      message: 'Factura enviada exitosamente',
      emailId: info.messageId,
      sentTo: to
    });

  } catch (error: any) {
    console.error('❌ Error enviando correo:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al enviar la factura',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// También puedes agregar un método GET para probar
export async function GET() {
  return NextResponse.json({
    message: 'API de envío de facturas está funcionando',
    status: 'active'
  });
}