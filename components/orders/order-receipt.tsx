/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product: {
    name: string;
    image_url: string[];
  };
}

interface Order {
  id: string;
  created_at: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  order_items: OrderItem[];
}

interface OrderReceiptProps {
  order: Order;
}

export default function OrderReceipt({ order }: OrderReceiptProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const whatsappNumber = ' 6141776394';

  // Helper function to get the first valid image URL
  const getFirstImageUrl = (imageUrl: string | string[]): string => {
    if (!imageUrl) return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc';
    
    if (typeof imageUrl === 'string') {
      try {
        const parsed = JSON.parse(imageUrl);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc';
      } catch {
        return imageUrl;
      }
    }
    
    return Array.isArray(imageUrl) && imageUrl.length > 0 
      ? imageUrl[0] 
      : 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc';
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const receiptElement = document.getElementById('order-receipt');
      if (!receiptElement) return;

      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`recibo-pedido-${order.id.slice(0, 8)}.pdf`);

      toast({
        title: "Recibo descargado",
        description: "El recibo se ha descargado correctamente",
      });
    } catch (error) {
      
      toast({
        title: "Error",
        description: "No se pudo generar el recibo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const shareViaWhatsapp = () => {
    const message = `¡Hola! Aquí está mi recibo de compra de Sapphirus. Pedido #${order.id.slice(0, 8)}.`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  
    toast({
      title: "Abriendo WhatsApp",
      description: "Recibo enviado como texto. Puedes compartir el archivo manualmente si es necesario.",
    });
  };
  

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generatePDF}
          disabled={isGenerating}
        >
          <Download className="mr-2 h-4 w-4" />
          Descargar Recibo
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={shareViaWhatsapp}
          disabled={isGenerating}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Compartir por WhatsApp
        </Button>
      </div>

      <div id="order-receipt" className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <img 
              src="/logo-black.png" 
              alt="Sapphirus Logo" 
              className="h-12 w-auto"
            />
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold">Recibo de Compra</h3>
            <p className="text-sm text-gray-600">Pedido #{order.id.slice(0, 8)}</p>
            <p className="text-sm text-gray-600">
              {new Date(order.created_at).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        <div className="border-t border-b py-4 my-4">
          <h4 className="font-medium mb-3">Detalles del Pedido</h4>
          <div className="space-y-3">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-12 w-12 relative rounded overflow-hidden">
                  <img
                    src={getFirstImageUrl(item.product?.image_url)}
                    alt={item.product?.name || 'Producto'}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.product?.name || 'Producto'}</p>
                  <p className="text-sm text-gray-600">
                    Cantidad: {item.quantity} × ${item.unit_price.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <div>
            <p className="text-sm text-gray-600">Estado: <span className="font-medium">{
              order.status === 'pending' ? 'Pendiente' :
              order.status === 'processing' ? 'En proceso' :
              order.status === 'shipped' ? 'Enviado' :
              order.status === 'delivered' ? 'Entregado' :
              'Cancelado'
            }</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Subtotal: ${order.total_amount.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Envío: $0.00</p>
            <p className="text-lg font-semibold">Total: ${order.total_amount.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
          <p>Gracias por tu compra en Sapphirus</p>
          <p>Para cualquier consulta, contáctanos al: 614 177 6394</p>
        </div>
      </div>
    </div>
  );
}