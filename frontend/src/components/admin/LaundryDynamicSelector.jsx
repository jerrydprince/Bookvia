import React from 'react';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';

const LaundryDynamicSelector = ({ laundryItems, value, onChange }) => {
  const handleAddItem = () => {
    if (laundryItems.length === 0) return;
    const firstItem = laundryItems[0];
    const newItem = {
      id: Date.now().toString(),
      item_id: firstItem.id,
      cloth_type: firstItem.cloth_type,
      washing: true,
      ironing: true,
      starching: false,
      quantity: 1,
      unit_price: (firstItem.washing_amount || 0) + (firstItem.ironing_amount || 0)
    };
    triggerChange([...value, newItem]);
  };

  const handleRemoveItem = (id) => {
    triggerChange(value.filter(item => item.id !== id));
  };

  const handleChange = (id, field, val) => {
    const updated = value.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: val };
        
        // If changing item type, update the cloth type and reset options
        if (field === 'item_id') {
          const matchedItem = laundryItems.find(i => i.id === val);
          if (matchedItem) {
            updatedItem.cloth_type = matchedItem.cloth_type;
          }
        }
        
        // Recalculate unit price
        const matchedItem = laundryItems.find(i => i.id === updatedItem.item_id);
        if (matchedItem) {
          let price = 0;
          if (updatedItem.washing) price += Number(matchedItem.washing_amount || 0);
          if (updatedItem.ironing) price += Number(matchedItem.ironing_amount || 0);
          if (updatedItem.starching) price += Number(matchedItem.starching_amount || 0);
          updatedItem.unit_price = price;
        }
        
        return updatedItem;
      }
      return item;
    });
    triggerChange(updated);
  };

  const triggerChange = (newItems) => {
    let totalQty = 0;
    let totalAmt = 0;
    const descParts = [];

    newItems.forEach(item => {
      totalQty += Number(item.quantity);
      totalAmt += Number(item.unit_price) * Number(item.quantity);
      
      const ops = [];
      if (item.washing) ops.push('Wash');
      if (item.ironing) ops.push('Iron');
      if (item.starching) ops.push('Starch');
      
      descParts.push(`${item.quantity}x ${item.cloth_type} (${ops.join('/')})`);
    });

    onChange(newItems, totalQty, totalAmt, descParts.join(', '));
  };

  if (laundryItems.length === 0) {
    return <div className="text-sm text-yellow-500 italic p-3 bg-yellow-500/10 rounded border border-yellow-500/20">Price list is empty. Please add items in the Price List tab first to use dynamic calculation.</div>;
  }

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div key={item.id} className="bg-dark-900 border border-dark-700 p-3 rounded-lg space-y-3 relative">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <select 
                value={item.item_id}
                onChange={(e) => handleChange(item.id, 'item_id', e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 text-white px-2 py-1.5 text-xs rounded outline-none focus:border-blue-500"
              >
                {laundryItems.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.cloth_type}</option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <input 
                type="number" min="1" 
                value={item.quantity}
                onChange={(e) => handleChange(item.id, 'quantity', Number(e.target.value))}
                className="w-full bg-dark-800 border border-dark-600 text-white px-2 py-1.5 text-xs rounded outline-none focus:border-blue-500 text-center"
              />
            </div>
            <button 
              type="button"
              onClick={() => handleRemoveItem(item.id)}
              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dark-750 pt-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-300">
                <input 
                  type="checkbox" 
                  checked={item.washing}
                  onChange={(e) => handleChange(item.id, 'washing', e.target.checked)}
                  className="accent-blue-500"
                />
                Washing
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-300">
                <input 
                  type="checkbox" 
                  checked={item.ironing}
                  onChange={(e) => handleChange(item.id, 'ironing', e.target.checked)}
                  className="accent-blue-500"
                />
                Ironing
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-300">
                <input 
                  type="checkbox" 
                  checked={item.starching}
                  onChange={(e) => handleChange(item.id, 'starching', e.target.checked)}
                  className="accent-blue-500"
                />
                Starching
              </label>
            </div>
            <div className="text-emerald-400 font-mono text-xs font-bold">
              ₦{(item.unit_price * item.quantity).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
      
      <button 
        type="button"
        onClick={handleAddItem}
        className="w-full py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 border-dashed rounded-lg text-xs text-blue-400 font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={14} /> Add Laundry Item
      </button>
    </div>
  );
};

export default LaundryDynamicSelector;
