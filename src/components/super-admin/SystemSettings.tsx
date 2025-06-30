import { useState, useEffect } from 'react';
import { supabase, SystemSetting, logAdminActivity, updateSystemSetting } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Save, RotateCcw, AlertTriangle } from 'lucide-react';

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const { user } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
      
      // Initialize edited values
      const initialValues: Record<string, any> = {};
      data?.forEach(setting => {
        initialValues[setting.setting_key] = setting.setting_value;
      });
      setEditedValues(initialValues);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (settingKey: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [settingKey]: value
    }));
  };

  const handleSaveSetting = async (setting: SystemSetting) => {
    if (!user) return;

    setSaving(prev => ({ ...prev, [setting.setting_key]: true }));

    try {
      const newValue = editedValues[setting.setting_key];
      
      await updateSystemSetting(setting.setting_key, newValue, user.id);

      // Log the activity
      await logAdminActivity(
        user.id,
        'update',
        'system_setting',
        setting.id,
        {
          setting_key: setting.setting_key,
          old_value: setting.setting_value,
          new_value: newValue
        }
      );

      // Update local state
      setSettings(prev => prev.map(s => 
        s.setting_key === setting.setting_key 
          ? { ...s, setting_value: newValue, updated_by: user.id }
          : s
      ));

      alert('Setting updated successfully!');
    } catch (error) {
      console.error('Error updating setting:', error);
      alert('Error updating setting. Please try again.');
    } finally {
      setSaving(prev => ({ ...prev, [setting.setting_key]: false }));
    }
  };

  const handleResetSetting = (setting: SystemSetting) => {
    setEditedValues(prev => ({
      ...prev,
      [setting.setting_key]: setting.setting_value
    }));
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const value = editedValues[setting.setting_key];
    const hasChanged = JSON.stringify(value) !== JSON.stringify(setting.setting_value);

    switch (typeof setting.setting_value) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleValueChange(setting.setting_key, e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(setting.setting_key, parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          />
        );
      
      default:
        if (setting.setting_key.includes('password') || setting.setting_key.includes('secret')) {
          return (
            <input
              type="password"
              value={value}
              onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          );
        }
        
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          />
        );
    }
  };

  const groupedSettings = settings.reduce((groups, setting) => {
    const category = setting.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(setting);
    return groups;
  }, {} as Record<string, SystemSetting[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-800 text-sm">
            <strong>Warning:</strong> Changing system settings can affect the entire application. 
            Please ensure you understand the impact before making changes.
          </p>
        </div>
      </div>

      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <div key={category} className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4 capitalize">
            {category.replace('_', ' ')} Settings
          </h4>
          
          <div className="space-y-6">
            {categorySettings.map((setting) => {
              const hasChanged = JSON.stringify(editedValues[setting.setting_key]) !== JSON.stringify(setting.setting_value);
              const isLoading = saving[setting.setting_key];
              
              return (
                <div key={setting.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900">
                        {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h5>
                      {setting.description && (
                        <p className="text-xs text-gray-600 mt-1">{setting.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {setting.is_public && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Public
                        </span>
                      )}
                      
                      {hasChanged && (
                        <button
                          onClick={() => handleResetSetting(setting)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Reset to original value"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleSaveSetting(setting)}
                        disabled={!hasChanged || isLoading}
                        className="flex items-center space-x-1 bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        <span>{isLoading ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    {renderSettingInput(setting)}
                  </div>
                  
                  {hasChanged && (
                    <div className="mt-2 text-xs text-orange-600">
                      Setting has unsaved changes
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}