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
import { Empty, Button, Tag, Tooltip } from '@douyinfe/semi-ui';
import CardTable from '../../common/ui/CardTable';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { timestamp2string, renderQuota, renderModelTag } from '../../../helpers';
import { IconEyeOpened } from '@douyinfe/semi-icons';

const ContentLogsTable = ({
  logs,
  loading,
  activePage,
  pageSize,
  logCount,
  handlePageChange,
  handlePageSizeChange,
  copyText,
  openContentModal,
  t,
}) => {
  const columns = [
    {
      title: t('时间'),
      dataIndex: 'created_at',
      render: (text) => timestamp2string(text),
      width: 160,
    },
    {
      title: t('用户'),
      dataIndex: 'username',
      width: 120,
    },
    {
      title: t('令牌'),
      dataIndex: 'token_name',
      render: (text) => (
        <Tag
          color='grey'
          shape='circle'
          onClick={(event) => copyText(event, text)}
          style={{ cursor: 'pointer' }}
        >
          {text}
        </Tag>
      ),
      width: 150,
    },
    {
      title: t('模型'),
      dataIndex: 'model_name',
      render: (text) =>
        renderModelTag(text, {
          onClick: (event) => copyText(event, text),
        }),
      width: 180,
    },
    {
      title: t('输入'),
      dataIndex: 'prompt_tokens',
      width: 80,
    },
    {
      title: t('输出'),
      dataIndex: 'completion_tokens',
      width: 80,
    },
    {
      title: t('花费'),
      dataIndex: 'quota',
      render: (text) => renderQuota(text, 6),
      width: 100,
    },
    {
      title: t('渠道'),
      dataIndex: 'channel',
      render: (text, record) => (
        <Tooltip content={record.channel_name || t('未知渠道')}>
          <Tag color='blue' shape='circle'>
            {text}
          </Tag>
        </Tooltip>
      ),
      width: 80,
    },
    {
      title: t('操作'),
      dataIndex: 'action',
      fixed: 'right',
      render: (text, record) => (
        <Button
          theme='borderless'
          type='primary'
          size='small'
          icon={<IconEyeOpened />}
          onClick={() =>
            openContentModal(record.request_content, record.response_content)
          }
        >
          {t('查看对话')}
        </Button>
      ),
      width: 120,
    },
  ];

  return (
    <CardTable
      columns={columns}
      dataSource={logs}
      rowKey='id'
      loading={loading}
      scroll={{ x: 'max-content' }}
      className='rounded-xl overflow-hidden'
      size='middle'
      empty={
        <Empty
          image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
          }
          description={t('暂无对话记录')}
          style={{ padding: 30 }}
        />
      }
      pagination={{
        currentPage: activePage,
        pageSize: pageSize,
        total: logCount,
        pageSizeOptions: [10, 20, 50, 100],
        showSizeChanger: true,
        onPageSizeChange: handlePageSizeChange,
        onPageChange: handlePageChange,
      }}
      hidePagination={true}
    />
  );
};

export default ContentLogsTable;
