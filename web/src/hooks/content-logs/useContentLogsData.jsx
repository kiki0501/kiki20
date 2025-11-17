/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import { useState, useEffect, useCallback } from 'react';
import { API, showError, showSuccess, copy } from '../../helpers';
import { useTranslation } from 'react-i18next';

export const useContentLogsData = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [logCount, setLogCount] = useState(0);
  const [logType, setLogType] = useState(2); // 默认只查询消费日志
  const [modelName, setModelName] = useState('');
  const [username, setUsername] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [endTimestamp, setEndTimestamp] = useState(Date.now() / 1000);
  const [channel, setChannel] = useState('');
  const [group, setGroup] = useState('');
  
  // Modal states
  const [showContentModal, setShowContentModal] = useState(false);
  const [currentContent, setCurrentContent] = useState({ request: '', response: '' });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    let url = `/api/log/content?page=${activePage}&page_size=${pageSize}`;
    
    if (logType) url += `&type=${logType}`;
    if (modelName) url += `&model_name=${modelName}`;
    if (username) url += `&username=${username}`;
    if (tokenName) url += `&token_name=${tokenName}`;
    if (startTimestamp) url += `&start_timestamp=${startTimestamp}`;
    if (endTimestamp) url += `&end_timestamp=${endTimestamp}`;
    if (channel) url += `&channel=${channel}`;
    if (group) url += `&group=${group}`;

    try {
      const res = await API.get(url);
      const { success, message, data } = res.data;
      
      if (success) {
        setLogs(data.items || []);
        setLogCount(data.total || 0);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('加载日志失败'));
    }
    setLoading(false);
  }, [activePage, pageSize, logType, modelName, username, tokenName, startTimestamp, endTimestamp, channel, group, t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handlePageChange = (page) => {
    setActivePage(page);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setActivePage(1);
  };

  const handleRefresh = () => {
    loadLogs();
  };

  const copyText = async (event, text) => {
    event.stopPropagation();
    if (await copy(text)) {
      showSuccess(t('已复制到剪贴板'));
    } else {
      showError(t('无法复制到剪贴板，请手动复制'));
    }
  };

  const openContentModal = (requestContent, responseContent) => {
    setCurrentContent({
      request: requestContent || t('无请求内容'),
      response: responseContent || t('无响应内容'),
    });
    setShowContentModal(true);
  };

  return {
    logs,
    loading,
    activePage,
    pageSize,
    logCount,
    logType,
    modelName,
    username,
    tokenName,
    startTimestamp,
    endTimestamp,
    channel,
    group,
    setLogType,
    setModelName,
    setUsername,
    setTokenName,
    setStartTimestamp,
    setEndTimestamp,
    setChannel,
    setGroup,
    handlePageChange,
    handlePageSizeChange,
    handleRefresh,
    copyText,
    showContentModal,
    setShowContentModal,
    currentContent,
    openContentModal,
    t,
  };
};
