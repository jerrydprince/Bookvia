import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, CheckCircle, X, Shirt, RefreshCw } from 'lucide-react';

const LaundryItemsManager = ({ items, onItemsChanged, hasAccess }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    cloth_type: '',
    washing_amount: 0,
    ironing_amount: 0,
    starching_amount: 0
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ cloth_type: '', washing_amount: 0, ironing_amount: 0, starching_amount: 0 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      cloth_type: item.cloth_type,
      washing_amount: item.washing_amount,
      ironing_amount: item.ironing_amount,
      starching_amount: item.starching_amount
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this laundry item?")) return;
    const tId = toast.loading("Deleting item...");
    try {
      const { error } = await supabase.from('laundry_items').delete().eq('id', id);
      if (error) throw error;
      toast.success("Item deleted successfully", { id: tId });
      onItemsChanged();
    } catch (err) {
      toast.error(err.message, { id: tId });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tId = toast.loading(editingItem ? "Updating item..." : "Adding item...");
    try {
      const payload = {
        cloth_type: formData.cloth_type,
        washing_amount: Number(formData.washing_amount),
        ironing_amount: Number(formData.ironing_amount),
        starching_amount: Number(formData.starching_amount)
      };

      if (editingItem) {
        const { error } = await supabase.from('laundry_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        toast.success("Item updated successfully", { id: tId });
      } else {
        const { error } = await supabase.from('laundry_items').insert([payload]);
        if (error) throw error;
        toast.success("Item added successfully", { id: tId });
      }
      setIsModalOpen(false);
      onItemsChanged();
    } catch (err) {
      toast.error(err.message, { id: tId });
    }
  };

  if (!hasAccess) {
    return <div className="p-8 text-center text-gray-500">You do not have permission to manage the price list.</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-dark-800 border border-dark-700 p-4 rounded-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shirt className="text-blue-500" /> Laundry Price List
        </h2>
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all text-sm shadow-lg"
        >
          <Plus size={16} /> Add New Item
        </button>
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-dark-900 border-b border-dark-700 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4">Cloth Type</th>
                <th className="p-4 text-right">Washing (₦)</th>
                <th className="p-4 text-right">Ironing (₦)</th>
                <th className="p-4 text-right">Starching (₦)</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/60">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-500 italic">No laundry items defined. Click Add New Item to begin.</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-dark-700/35 transition-colors">
                    <td className="p-4 font-bold text-white">{item.cloth_type}</td>
                    <td className="p-4 text-right font-mono text-emerald-400">{(item.washing_amount || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-emerald-400">{(item.ironing_amount || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-emerald-400">{(item.starching_amount || 0).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white">
                {editingItem ? 'Edit Laundry Item' : 'Add New Laundry Item'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Cloth Type *</label>
                <input
                  type="text" required
                  placeholder="e.g. Shirt, Trousers"
                  value={formData.cloth_type}
                  onChange={e => setFormData({ ...formData, cloth_type: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 text-white px-3 py-2 text-sm rounded-lg outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Washing (₦)</label>
                  <input
                    type="number" min="0" required
                    value={formData.washing_amount}
                    onChange={e => setFormData({ ...formData, washing_amount: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 text-emerald-400 font-mono px-3 py-2 text-sm rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Ironing (₦)</label>
                  <input
                    type="number" min="0" required
                    value={formData.ironing_amount}
                    onChange={e => setFormData({ ...formData, ironing_amount: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 text-emerald-400 font-mono px-3 py-2 text-sm rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Starching (₦)</label>
                  <input
                    type="number" min="0" required
                    value={formData.starching_amount}
                    onChange={e => setFormData({ ...formData, starching_amount: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 text-emerald-400 font-mono px-3 py-2 text-sm rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition-all"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaundryItemsManager;
