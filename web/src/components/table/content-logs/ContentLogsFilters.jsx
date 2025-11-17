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

import React from 'react';
import { Form, Button, Space } from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';

const ContentLogsFilters = ({
  username,
  setUsername,
  tokenName,
  setTokenName,
  modelName,
  setModelName,
  channel,
  setChannel,
  startTimestamp,
  setStartTimestamp,
  endTimestamp,
  setEndTimestamp,
  handleRefresh,
  t,
}) => {
  const handleSubmit = (values) => {
    setUsername(values.username || '');
    setTokenName(values.token_name || '');
    setModelName(values.model_name || '');
    setChannel(values.channel || '');
    
    if (values.time_range && values.time_range.length === 2) {
      setStartTimestamp(Math.floor(values.time_range[0].getTime() / 1000));
      setEndTimestamp(Math.floor(values.time_range[1].getTime() / 1000));
    } else {
      setStartTimestamp(0);
      setEndTimestamp(Math.floor(Date.now() / 1000));
    }
    
    handleRefresh();
  };

  const handleReset = () => {
    setUsername('');
    setTokenName('');
    setModelName('');
    setChannel('');
    setStartTimestamp(0);
    setEndTimestamp(Math.floor(Date.now() / 1000));
    handleRefresh();
  };

  return (
    <Form
      layout='horizontal'
      onSubmit={handleSubmit}
      style={{ padding: '10px 0' }}
    >
      <Space wrap>
        <Form.Input
          field='username'
          label={t('用户名')}
          placeholder={t('输入用户名')}
          style={{ width: 150 }}
        />
        <Form.Input
          field='token_name'
          label={t('令牌名称')}
          placeholder={t('输入令牌名称')}
          style={{ width: 150 }}
        />
        <Form.Input
          field='model_name'
          label={t('模型名称')}
          placeholder={t('输入模型名称')}
          style={{ width: 150 }}
        />
        <Form.Input
          field='channel'
          label={t('渠道')}
          placeholder={t('输入渠道ID')}
          style={{ width: 120 }}
        />
        <Form.DatePicker
          field='time_range'
          label={t('时间范围')}
          type='dateTimeRange'
          style={{ width: 350 }}
        />
        <Button
          type='primary'
          htmlType='submit'
          icon={<IconSearch />}
          style={{ marginRight: 8 }}
        >
          {t('搜索')}
        </Button>
        <Button onClick={handleReset}>{t('重置')}</Button>
      </Space>
    </Form>
  );
};

export default ContentLogsFilters;
