<template>
  <view class="case-picker">
    <view v-if="showSearch" class="search-wrap">
      <case-building-search :value="buildingQuery" @input="$emit('update:buildingQuery', $event)" />
    </view>
    <view class="library-workspace">
      <case-style-sidebar :value="styleFilter" @input="$emit('update:styleFilter', $event)" />
      <scroll-view class="gallery-content" scroll-y>
        <case-gallery-folder-grid
          v-if="folders.length"
          :folders="folders"
          :active-id="activeId"
          @select="$emit('select', $event)"
        />
        <view v-else class="state-block">暂无二级图库</view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import CaseBuildingSearch from './case-building-search.vue'
import CaseGalleryFolderGrid from './case-gallery-folder-grid.vue'
import CaseStyleSidebar from './case-style-sidebar.vue'

export default {
  components: { CaseBuildingSearch, CaseGalleryFolderGrid, CaseStyleSidebar },
  props: {
    showSearch: { type: Boolean, default: true },
    buildingQuery: { type: String, default: '' },
    styleFilter: { type: String, default: '全部' },
    folders: { type: Array, default: () => [] },
    activeId: { type: String, default: '' }
  }
}
</script>

<style scoped>
.case-picker {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.search-wrap {
  flex-shrink: 0;
  padding: 10px 14px 0;
  background: #fff;
}
.library-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  background: #f4f4f4;
}
.gallery-content {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px 14px 18px;
}
.state-block {
  padding: 58px 10px;
  color: #8a817c;
  font-size: 13px;
  text-align: center;
}
</style>
