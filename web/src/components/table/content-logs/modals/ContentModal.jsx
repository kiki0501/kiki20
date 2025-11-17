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

import React, { useState } from 'react';
import { Modal, Tabs, TabPane, Button, Typography } from '@douyinfe/semi-ui';
import { IconCopy } from '@douyinfe/semi-icons';
import { copy, showSuccess, showError } from '../../../../helpers';

const { Text } = Typography;

const ContentModal = ({
  showContentModal,
  setShowContentModal,
  currentContent,
  t,
}) => {
  const [activeTab, setActiveTab] = useState('request');

  const handleCopy = async (text) => {
    if (await copy(text)) {
      showSuccess(t('已复制到剪贴板'));
    } else {
      showError(t('无法复制到剪贴板'));
    }
  };

  const formatJSON = (text) => {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  return (
    <Modal
      title={t('对话内容详情')}
      visible={showContentModal}
      onCancel={() => setShowContentModal(false)}
      footer={
        <Button onClick={() => setShowContentModal(false)}>
          {t('关闭')}
        </Button>
      }
      width={900}
      bodyStyle={{ padding: 0 }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type='line'
        style={{ padding: '0 24px' }}
      >
        <TabPane
          tab={t('用户请求')}
          itemKey='request'
          style={{ padding: '16px 0' }}
        >
          <div style={{ marginBottom: 12 }}>
            <Button
              icon={<IconCopy />}
              size='small'
              onClick={() => handleCopy(currentContent.request)}
            >
              {t('复制请求内容')}
            </Button>
          </div>
          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: 16,
              borderRadius: 4,
              maxHeight: 500,
              overflow: 'auto',
            }}
          >
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            >
              {formatJSON(currentContent.request)}
            </pre>
          </div>
        </TabPane>
        <TabPane
          tab={t('AI响应')}
          itemKey='response'
          style={{ padding: '16px 0' }}
        >
          <div style={{ marginBottom: 12 }}>
            <Button
              icon={<IconCopy />}
              size='small'
              onClick={() => handleCopy(currentContent.response)}
            >
              {t('复制响应内容')}
            </Button>
          </div>
          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: 16,
              borderRadius: 4,
              maxHeight: 500,
              overflow: 'auto',
            }}
          >
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            >
              {formatJSON(currentContent.response)}
            </pre>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default ContentModal;
