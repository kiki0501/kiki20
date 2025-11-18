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

import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Typography, Space, Banner, Spin, Tag } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess, showWarning } from '../../helpers';
import { IconGithubLogo, IconSync, IconSave, IconRefresh } from '@douyinfe/semi-icons';

const { Title, Text, Paragraph } = Typography;

const GitHubSync = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [config, setConfig] = useState({
    github_sync_token: '',
    github_sync_repo: '',
    github_sync_interval: '300',
  });
  const [syncStatus, setSyncStatus] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadSyncStatus();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/option/');
      if (res.data.success) {
        const options = res.data.data;
        // 将数组转换为对象
        const optionsMap = {};
        options.forEach(opt => {
          optionsMap[opt.key] = opt.value;
        });
        
        setConfig({
          github_sync_token: optionsMap.GitHubSyncToken || '',
          github_sync_repo: optionsMap.GitHubSyncRepo || '',
          github_sync_interval: optionsMap.GitHubSyncInterval || '300',
        });
      }
    } catch (error) {
      showError(t('加载配置失败'));
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const res = await API.get('/api/github/sync/status');
      if (res.data.success) {
        setSyncStatus(res.data.data);
        if (res.data.data.last_sync_time) {
          setLastSyncTime(new Date(res.data.data.last_sync_time));
        }
      }
    } catch (error) {
      // 忽略状态加载错误
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 验证配置
      if (!config.github_sync_token || !config.github_sync_repo) {
        showWarning(t('请填写 GitHub Token 和仓库地址'));
        setLoading(false);
        return;
      }

      // 保存配置到数据库
      const updates = [
        { key: 'GitHubSyncToken', value: config.github_sync_token },
        { key: 'GitHubSyncRepo', value: config.github_sync_repo },
        { key: 'GitHubSyncInterval', value: config.github_sync_interval },
      ];

      for (const update of updates) {
        const res = await API.put('/api/option/', update);
        if (!res.data.success) {
          throw new Error(res.data.message || '保存失败');
        }
      }

      showSuccess(t('配置保存成功，立即生效'));
      // 重新加载同步状态
      loadSyncStatus();
    } catch (error) {
      showError(t('保存配置失败: ') + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await API.post('/api/github/sync');
      if (res.data.success) {
        showSuccess(t('同步成功'));
        loadSyncStatus();
      } else {
        showError(t('同步失败: ') + (res.data.message || ''));
      }
    } catch (error) {
      showError(t('同步失败: ') + (error.message || ''));
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    try {
      const res = await API.post('/api/github/sync/pull');
      if (res.data.success) {
        showSuccess(t('拉取成功，数据已恢复'));
        loadSyncStatus();
      } else {
        showError(t('拉取失败: ') + (res.data.message || ''));
      }
    } catch (error) {
      showError(t('拉取失败: ') + (error.message || ''));
    } finally {
      setPulling(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return t('从未同步');
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className='mt-[60px] px-4 max-w-6xl mx-auto'>
      <div className='mb-6'>
        <Title heading={2} className='flex items-center gap-2'>
          <IconGithubLogo size='large' />
          {t('GitHub 数据同步')}
        </Title>
        <Text type='tertiary'>
          {t('使用 GitHub 仓库备份和同步令牌、渠道、模型等数据（不包括日志）')}
        </Text>
      </div>

      <Banner
        type='info'
        icon={null}
        closeIcon={null}
        className='mb-6'
        description={
          <div>
            <Paragraph>
              <strong>{t('功能说明：')}</strong>
            </Paragraph>
            <ul className='list-disc list-inside space-y-1'>
              <li>{t('自动同步令牌数据（包括额度和过期时间）')}</li>
              <li>{t('自动同步渠道配置')}</li>
              <li>{t('自动同步模型配置')}</li>
              <li>{t('不会同步日志数据')}</li>
              <li>{t('需要 GitHub Personal Access Token (PAT) 和私有仓库')}</li>
            </ul>
          </div>
        }
      />

      <Space vertical spacing='large' style={{ width: '100%' }}>
        {/* 同步状态卡片 */}
        <Card
          title={
            <div className='flex items-center justify-between'>
              <span>{t('同步状态')}</span>
              <Button
                icon={<IconRefresh />}
                size='small'
                type='tertiary'
                onClick={loadSyncStatus}
              >
                {t('刷新')}
              </Button>
            </div>
          }
          bordered
        >
          <Space vertical spacing='medium' style={{ width: '100%' }}>
            <div className='flex items-center justify-between'>
              <Text>{t('服务状态：')}</Text>
              {syncStatus?.enabled ? (
                <Tag color='green'>{t('已启用')}</Tag>
              ) : (
                <Tag color='grey'>{t('未启用')}</Tag>
              )}
            </div>
            <div className='flex items-center justify-between'>
              <Text>{t('上次同步：')}</Text>
              <Text type='tertiary'>{formatTime(lastSyncTime)}</Text>
            </div>
            {syncStatus?.enabled && (
              <div className='flex items-center justify-between'>
                <Text>{t('同步间隔：')}</Text>
                <Text type='tertiary'>{config.github_sync_interval} {t('秒')}</Text>
              </div>
            )}
            <Space vertical spacing='medium' style={{ width: '100%' }}>
              <Button
                icon={<IconSync />}
                type='primary'
                onClick={handleSync}
                loading={syncing}
                disabled={!config.github_sync_token || !config.github_sync_repo || pulling}
                block
              >
                {syncing ? t('同步中...') : t('推送到 GitHub')}
              </Button>
              <Button
                icon={<IconRefresh />}
                type='secondary'
                onClick={handlePull}
                loading={pulling}
                disabled={!config.github_sync_token || !config.github_sync_repo || syncing}
                block
              >
                {pulling ? t('拉取中...') : t('从 GitHub 拉取')}
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 配置卡片 */}
        <Card title={t('GitHub 配置')} bordered>
          <Spin spinning={loading}>
            <Form labelPosition='left' labelWidth='150px'>
              <Form.Input
                field='github_sync_token'
                label={t('GitHub Token')}
                placeholder='ghp_xxxxxxxxxxxx'
                value={config.github_sync_token}
                onChange={(value) =>
                  setConfig({ ...config, github_sync_token: value })
                }
                extraText={
                  <Text type='tertiary' size='small'>
                    {t('需要 repo 权限的 Personal Access Token')}
                  </Text>
                }
              />
              <Form.Input
                field='github_sync_repo'
                label={t('仓库地址')}
                placeholder='https://github.com/username/repo'
                value={config.github_sync_repo}
                onChange={(value) =>
                  setConfig({ ...config, github_sync_repo: value })
                }
                extraText={
                  <Text type='tertiary' size='small'>
                    {t('建议使用私有仓库以保护数据安全')}
                  </Text>
                }
              />
              <Form.Input
                field='github_sync_interval'
                label={t('同步间隔（秒）')}
                placeholder='300'
                value={config.github_sync_interval}
                onChange={(value) =>
                  setConfig({ ...config, github_sync_interval: value })
                }
                extraText={
                  <Text type='tertiary' size='small'>
                    {t('自动同步的时间间隔，默认 300 秒（5 分钟）')}
                  </Text>
                }
              />
              <div className='flex justify-end gap-3 mt-6'>
                <Button onClick={loadConfig}>{t('重置')}</Button>
                <Button
                  type='primary'
                  icon={<IconSave />}
                  onClick={handleSave}
                  loading={loading}
                >
                  {t('保存配置')}
                </Button>
              </div>
            </Form>
          </Spin>
        </Card>

        {/* 使用说明卡片 */}
        <Card title={t('使用说明')} bordered>
          <Space vertical spacing='medium'>
            <div>
              <Text strong>{t('1. 创建 GitHub Token')}</Text>
              <Paragraph type='tertiary'>
                {t('访问')} <a href='https://github.com/settings/tokens' target='_blank' rel='noopener noreferrer'>GitHub Settings → Tokens</a>
                {t('，创建一个具有 repo 权限的 Personal Access Token')}
              </Paragraph>
            </div>
            <div>
              <Text strong>{t('2. 准备私有仓库')}</Text>
              <Paragraph type='tertiary'>
                {t('创建一个私有 GitHub 仓库用于存储备份数据，确保数据安全')}
              </Paragraph>
            </div>
            <div>
              <Text strong>{t('3. 配置并保存')}</Text>
              <Paragraph type='tertiary'>
                {t('填写上述配置信息并保存，然后重启服务以启用同步功能')}
              </Paragraph>
            </div>
            <div>
              <Text strong>{t('4. 验证同步')}</Text>
              <Paragraph type='tertiary'>
                {t('服务重启后，可以点击"立即同步"按钮测试同步功能，或等待自动同步')}
              </Paragraph>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default GitHubSync;