import React from 'react'
import ServiceHeader from './components/Serviceheader/ServiceHeader'
import ServiceCard from './components/Servicecard/ServiceCard'
import ServiceComment from './components/Servicecomment/ServiceComment'

const Services = () => {
  return (
    <div>
      <ServiceHeader />
      <ServiceCard />
      <ServiceComment />
    </div>
  )
}

export default Services